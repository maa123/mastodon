# frozen_string_literal: true

class StatusesSearchService < BaseService

  attr_accessor :url
  attr_accessor :enabled

  def initialize
    self.enabled = ENV['SEARCH_ENABLED'] == 'true'
    self.url = ENV.fetch('SEARCH_ENDPOINT') { 'http://localhost:8080' }
  end

  def search(text, account, offset, limit)
    response = HTTP.get(self.url, :params => {"query" => text, "account" => account.id, "offset" => offset, "limit" => limit})
    JSON.parse(response.body.to_s)
  end

  def call(query, account = nil, options = {})
    @query   = query&.strip
    @account = account
    @options = options
    @limit   = options[:limit].to_i
    @offset  = options[:offset].to_i

    convert_deprecated_options!
    status_search_results
  end

  private

  def status_search_results
    ids = self.search(@query, @account, @offset, @limit)
    results = Status.where(id: ids)
                    .where(visibility: :public)
                    .limit @limit

    if @options[:account_id].present?
      results = results.where account_id: @options[:account_id]
    end

    if @options[:min_id].present?
      results = results.where("statuses.id > ?", @options[:min_id])
    end

    if @options[:max_id].present?
      results = results.where("statuses.id < ?", @options[:max_id])
    end

    account_ids         = results.map(&:account_id)
    account_domains     = results.map(&:account_domain)
    preloaded_relations = relations_map_for_account(@account, account_ids, account_domains)

    results.reject { |status| StatusFilter.new(status, @account, preloaded_relations).filtered? }
  end

  def parsed_query
    SearchQueryTransformer.new.apply(SearchQueryParser.new.parse(@query), current_account: @account)
  end

  def convert_deprecated_options!
    syntax_options = []

    if @options[:account_id]
      username = Account.select(:username, :domain).find(@options[:account_id]).acct
      syntax_options << "from:@#{username}"
    end

    if @options[:min_id]
      timestamp = Mastodon::Snowflake.to_time(@options[:min_id].to_i)
      syntax_options << "after:\"#{timestamp.iso8601}\""
    end

    if @options[:max_id]
      timestamp = Mastodon::Snowflake.to_time(@options[:max_id].to_i)
      syntax_options << "before:\"#{timestamp.iso8601}\""
    end

    @query = "#{@query} #{syntax_options.join(' ')}".strip if syntax_options.any?
  end

  def relations_map_for_account(account, account_ids, domains)
    {
      blocking: Account.blocking_map(account_ids, account.id),
      blocked_by: Account.blocked_by_map(account_ids, account.id),
      muting: Account.muting_map(account_ids, account.id),
      following: Account.following_map(account_ids, account.id),
      domain_blocking_by_domain: Account.domain_blocking_map_by_domain(domains, account.id),
    }
  end
end

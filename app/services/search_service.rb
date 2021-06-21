# frozen_string_literal: true

class SearchService < BaseService
  attr_accessor :host
  attr_accessor :port
  attr_accessor :prefix
  attr_accessor :url
  attr_accessor :enabled

  def initialize
    self.host = ENV.fetch('GS_HOST') { 'localhost' }
    self.port = ENV.fetch('GS_PORT') { 10041 }
    self.prefix = ENV.fetch('GS_API_PREFIX') { '' }
    self.url = 'http://' + self.host + ':' + self.port.to_s + '/' + self.prefix
    self.enabled = ENV['GS_ENABLED'] == 'true'
  end

  def search(text, offset, limit)
    response = HTTP.get(self.url.to_s + 'select', :params => { "table" => "statuses", "match_columns" => "text", "query" => escape(text), "sort_keys" => "_key", "offset" => offset, "limit" => limit, "filter" => 'spoiler_text == ""', "output_columns" => "_key" })
    resp = JSON.parse(response.body.to_s)
    header = resp[0]
    body = resp[1]
    arr = []
    if header[0] != 0
      arr
    end
    items = body[0][2..-1]
    items.each { |item|
      arr.push(item[0])
    }
    arr
  end

  def call(query, account, limit, options = {})
    @query   = query&.strip
    @account = account
    @options = options
    @limit   = limit.to_i
    @offset  = options[:type].blank? ? 0 : options[:offset].to_i
    @resolve = options[:resolve] || false

    default_results.tap do |results|
      next if @query.blank? || @limit.zero?

      if url_query?
        results.merge!(url_resource_results) unless url_resource.nil? || @offset.positive? || (@options[:type].present? && url_resource_symbol != @options[:type].to_sym)
      elsif @query.present?
        results[:accounts] = perform_accounts_search! if account_searchable?
        results[:statuses] = perform_statuses_search! if full_text_searchable?
        results[:hashtags] = perform_hashtags_search! if hashtag_searchable?
      end
    end
  end

  private

  def escape(text)
    text.gsub(/[\\"()]/, "\\" => '\\\\', '"' => '\"', '(' => '\(', ')' => '\)')
  end

  def escape_str(text)
    '"' + text.gsub(/[\\"]/, "\\" => '\\\\', '"' => '\"') + '"'
  end

  def perform_accounts_search!
    AccountSearchService.new.call(
      @query,
      @account,
      limit: @limit,
      resolve: @resolve,
      offset: @offset
    )
  end

  def perform_statuses_search!
    ids = self.search(@query, @offset, @limit)
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

  def perform_hashtags_search!
    TagSearchService.new.call(
      @query,
      limit: @limit,
      offset: @offset,
      exclude_unreviewed: @options[:exclude_unreviewed]
    )
  end

  def default_results
    { accounts: [], hashtags: [], statuses: [] }
  end

  def url_query?
    @resolve && /\Ahttps?:\/\//.match?(@query)
  end

  def url_resource_results
    { url_resource_symbol => [url_resource] }
  end

  def url_resource
    @_url_resource ||= ResolveURLService.new.call(@query, on_behalf_of: @account)
  end

  def url_resource_symbol
    url_resource.class.name.downcase.pluralize.to_sym
  end

  def full_text_searchable?
    return false unless self.enabled

    statuses_search? && !@account.nil? && !((@query.start_with?('#') || @query.include?('@')) && !@query.include?(' '))
  end

  def account_searchable?
    account_search? && !(@query.start_with?('#') || (@query.include?('@') && @query.include?(' ')))
  end

  def hashtag_searchable?
    hashtag_search? && !@query.include?('@')
  end

  def account_search?
    @options[:type].blank? || @options[:type] == 'accounts'
  end

  def hashtag_search?
    @options[:type].blank? || @options[:type] == 'hashtags'
  end

  def statuses_search?
    @options[:type].blank? || @options[:type] == 'statuses'
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

  def parsed_query
    SearchQueryTransformer.new.apply(SearchQueryParser.new.parse(@query))
  end
end

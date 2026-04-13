# frozen_string_literal: true

class UpdateAccountService < BaseService
  def call(account, params, raise_error: false)
    was_locked    = account.locked
    update_method = raise_error ? :update! : :update
    invalid_image_attribute = nil

    validate_image_dimensions!(params.slice(:avatar, :header)) do |attribute|
      invalid_image_attribute = attribute
    end

    account.send(update_method, params).tap do |ret|
      next unless ret

      authorize_all_follow_requests(account) if was_locked && !account.locked
      check_links(account)
      process_hashtags(account)
    end
  rescue Mastodon::DimensionsValidationError, Mastodon::StreamValidationError => e
    account.errors.add(invalid_image_attribute || :avatar, e.message)
    false
  end

  private

  def authorize_all_follow_requests(account)
    follow_requests = FollowRequest.where(target_account: account)
    follow_requests = follow_requests.preload(:account).select { |req| !req.account.silenced? }
    AuthorizeFollowWorker.push_bulk(follow_requests, limit: 1_000) do |req|
      [req.account_id, req.target_account_id]
    end
  end

  def check_links(account)
    VerifyAccountLinksWorker.perform_async(account.id) if account.fields.any?(&:requires_verification?)
  end

  def process_hashtags(account)
    account.tags_as_strings = Extractor.extract_hashtags(account.note)
  end

  def validate_image_dimensions!(params)
    params.each do |attribute, file|
      validate_image_dimension!(file)
    rescue Mastodon::DimensionsValidationError
      yield attribute if block_given?
      raise
    end
  end

  def validate_image_dimension!(file)
    return unless file.respond_to?(:content_type) && file.respond_to?(:path)
    return unless file.content_type&.start_with?('image/')

    width, height = FastImage.size(file.path)
    return unless width.present? && height.present?

    if file.content_type == 'image/gif' && width * height > Attachmentable::GIF_MATRIX_LIMIT
      raise Mastodon::DimensionsValidationError, "#{width}x#{height} GIF files are not supported"
    elsif width * height > Attachmentable::MAX_MATRIX_LIMIT
      raise Mastodon::DimensionsValidationError, "#{width}x#{height} images are not supported"
    end
  end
end

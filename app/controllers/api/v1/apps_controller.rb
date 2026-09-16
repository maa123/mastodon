# frozen_string_literal: true

class Api::V1::AppsController < Api::BaseController
  skip_before_action :require_authenticated_user!

  BLOCKED_WEBSITE_HOSTS = %w(example.com).freeze

  def create
    return respond_with_error(500) if blocked_website?

    @app = Doorkeeper::Application.create!(application_options)
    render json: @app, serializer: REST::CredentialApplicationSerializer
  end

  private

  def blocked_website?
    website = app_params[:website]
    return false if website.blank?
    return true unless website.is_a?(String)

    website_host = Addressable::URI.parse(website)&.host
    website_host.present? && BLOCKED_WEBSITE_HOSTS.include?(website_host.downcase)
  rescue Addressable::URI::InvalidURIError
    false
  end

  def application_options
    {
      name: app_params[:client_name],
      redirect_uri: app_params[:redirect_uris],
      scopes: app_scopes_or_default,
      website: app_params[:website],
    }
  end

  def app_scopes_or_default
    app_params[:scopes] || Doorkeeper.configuration.default_scopes
  end

  def app_params
    params.permit(:client_name, :scopes, :website, :redirect_uris, redirect_uris: [])
  end
end

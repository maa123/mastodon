# frozen_string_literal: true

if ENV['DKIM_DOMAIN'].present?
  Dkim.domain = ENV.fetch('DKIM_DOMAIN') { 'example.com' }
  Dkim.selector = ENV.fetch('DKIM_SELECTOR') { 'default' }
  private_key_path = ENV.fetch('DKIM_PRIVATE_KEY_PATH') { 'dkim/private.pem' }
  Dkim.private_key = File.read(private_key_path)

  ActionMailer::Base.register_interceptor(Dkim::Interceptor)
end

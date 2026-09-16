# frozen_string_literal: true

module Auth::RegistrationSpamConcern
  extend ActiveSupport::Concern

  def set_registration_form_time
    session[:registration_form_time] = Time.now.utc
  end

  def suspicious_invite_request_text?
    suspicious_ascii_only_text?(params.dig(:user, :invite_request_attributes, :text))
  end

  def render_fake_successful_sign_up
    Rails.logger.info("Registration rejected as spam (ascii-only invite request text) from #{request.remote_ip}")

    expire_data_after_sign_in! if respond_to?(:expire_data_after_sign_in!, true)
    set_flash_message! :notice, :signed_up_but_unconfirmed
    redirect_to after_inactive_sign_up_path_for(nil)
  end
end

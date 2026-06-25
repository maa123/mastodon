# frozen_string_literal: true

Rails.application.configure do
  config.x.ffmpeg_binary = ENV['FFMPEG_BINARY'] || 'ffmpeg'
  config.x.ffprobe_binary = ENV['FFPROBE_BINARY'] || 'ffprobe'
end

module FfmpegExecutionGuard
  DISABLED_BINARIES = %w(ffmpeg ffprobe).freeze

  def run(interpolations = {})
    binary = instance_variable_get(:@binary).to_s
    configured = [
      Rails.configuration.x.ffmpeg_binary,
      Rails.configuration.x.ffprobe_binary,
    ].compact.map(&:to_s)

    if (configured + DISABLED_BINARIES).include?(binary)
      raise Terrapin::CommandNotFoundError, 'ffmpeg is disabled'
    end

    super
  end
end

Terrapin::CommandLine.prepend(FfmpegExecutionGuard)

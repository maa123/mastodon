# frozen_string_literal: true

class StatusesIndex < Chewy::Index
  include FormattingHelper

  settings index: { refresh_interval: '30s', number_of_shards: 5 }, analysis: {
    tokenizer: {
      sudachi_tokenizer: {
        type: 'sudachi_tokenizer',
        mode: 'search',
        discard_punctuation: true,
        resources_path: '/etc/elasticsearch',
      },
    },
    filter: {
      english_stop: {
        type: 'stop',
        stopwords: '_english_',
      },

      english_stemmer: {
        type: 'stemmer',
        language: 'english',
      },

      english_possessive_stemmer: {
        type: 'stemmer',
        language: 'possessive_english',
      },
    },

    analyzer: {
      content: {
        filter: %w(
          lowercase
          cjk_width
          sudachi_part_of_speech
          sudachi_ja_stop
          sudachi_baseform
        ),
        tokenizer: 'sudachi_tokenizer',
        type: 'custom',
      },

      hashtag: {
        tokenizer: 'keyword',
        filter: %w(
          word_delimiter_graph
          lowercase
          asciifolding
          cjk_width
        ),
      },
    },
  }

  index_scope ::Status.unscoped.kept.without_reblogs.includes(:media_attachments, :preview_cards, :local_mentioned, :local_favorited, :local_reblogged, :local_bookmarked, :tags, preloadable_poll: :local_voters), delete_if: ->(status) { status.searchable_by.empty? }

  root date_detection: false do
    field(:id, type: 'long')
    field(:account_id, type: 'long')
    field(:text, type: 'text', analyzer: 'verbatim', value: ->(status) { status.searchable_text }) { field(:stemmed, type: 'text', analyzer: 'content') }
    field(:tags, type: 'text', analyzer: 'hashtag',  value: ->(status) { status.tags.map(&:display_name) })
    field(:searchable_by, type: 'long', value: ->(status) { status.searchable_by })
    field(:language, type: 'keyword')
    field(:properties, type: 'keyword', value: ->(status) { status.searchable_properties })
    field(:created_at, type: 'date')
  end
end

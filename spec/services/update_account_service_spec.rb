# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UpdateAccountService, type: :service do
  subject { described_class.new }

  describe 'switching form locked to unlocked accounts' do
    let(:account) { Fabricate(:account, locked: true) }
    let(:alice)   { Fabricate(:account) }
    let(:bob)     { Fabricate(:account) }
    let(:eve)     { Fabricate(:account) }

    before do
      bob.touch(:silenced_at)
      account.mute!(eve)

      FollowService.new.call(alice, account)
      FollowService.new.call(bob, account)
      FollowService.new.call(eve, account)

      subject.call(account, { locked: false })
    end

    it 'auto-accepts pending follow requests' do
      expect(alice.following?(account)).to be true
      expect(alice.requested?(account)).to be false
    end

    it 'does not auto-accept pending follow requests from silenced users' do
      expect(bob.following?(account)).to be false
      expect(bob.requested?(account)).to be true
    end

    it 'auto-accepts pending follow requests from muted users so as to not leak mute' do
      expect(eve.following?(account)).to be true
      expect(eve.requested?(account)).to be false
    end
  end

  describe 'oversized profile images' do
    let(:account) { Fabricate(:account) }
    let(:oversized_image) { Rails.root.join('spec', 'fixtures', 'files', '4096x4097.png') }

    it 'adds avatar errors to avatar' do
      result = subject.call(account, { avatar: Rack::Test::UploadedFile.new(oversized_image, 'image/png') })

      expect(result).to be false
      expect(account.errors.attribute_names).to include(:avatar)
      expect(account.errors.attribute_names).to_not include(:header)
    end

    it 'adds header errors to header' do
      result = subject.call(account, { header: Rack::Test::UploadedFile.new(oversized_image, 'image/png') })

      expect(result).to be false
      expect(account.errors.attribute_names).to include(:header)
      expect(account.errors.attribute_names).to_not include(:avatar)
    end
  end
end

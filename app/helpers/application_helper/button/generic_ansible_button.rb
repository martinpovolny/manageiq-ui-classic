class ApplicationHelper::Button::GenericAnsibleButton < ApplicationHelper::Button::Basic
  # to be renamed or removed to play nice with
  # https://github.com/ManageIQ/manageiq-ui-classic/pull/3756

  def role_allows_feature?
    true
  end
end

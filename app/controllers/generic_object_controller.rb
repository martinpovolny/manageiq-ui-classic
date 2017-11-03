class GenericObjectController < ApplicationController
  before_action :check_privileges
  before_action :get_session_data

  after_action :cleanup_action
  after_action :set_session_data

  include Mixins::GenericListMixin
  include Mixins::GenericSessionMixin
  include Mixins::GenericShowMixin
  include Mixins::GenericButtonMixin

  menu_section :automate
  toolbar :generic_object

  def self.model
    GenericObject
  end

  def self.display_methods
    []
  end

  def display_methods(record)
    associations = %w()
    record.property_associations.each do |key, _value|
      associations.push(key)
    end
    associations
  end

  def display_nested_generic(display)
    return unless @record.property_associations.key?(display)
    nested_list(display, @record.generic_object_definition.properties[:associations][display], :association => display)
  end

  private

  def textual_group_list
    [%i(properties attribute_details_list associations)]
  end

  helper_method :textual_group_list
end

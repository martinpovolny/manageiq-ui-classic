class ApplicationHelper::Toolbar::Basic
  include Singleton
  extend SingleForwardable
  delegate %i(api_button button select twostate separator definition button_group custom_content) => :instance

  def custom_content(name, args)
    @definition[name] = ApplicationHelper::Toolbar::Custom.new(name, args)
  end

  def button_group(name, buttons)
    @definition[name] = ApplicationHelper::Toolbar::Group.new(name, buttons)
  end

  def api_button(id, icon, title, text, keys = {})
    keys[:data] = {
      'function'      => 'sendDataWithRx',
      'function-data' => {
        'type'       => "generic",
        'controller' => "toolbarActions",
        'payload'    => {
          'entity' => keys[:api][:entity].pluralize,
          'action' => keys[:api][:action]
        }
      }.to_json
    }
    generic_button(:button, id, icon, title, text, keys)
  end

  def button(id, icon, title, text, keys = {})
    generic_button(:button, id, icon, title, text, keys)
  end

  def select(id, icon, title, text, keys = {})
    generic_button(:buttonSelect, id, icon, title, text, keys)
  end

  def twostate(id, icon, title, text, keys = {})
    generic_button(:buttonTwoState, id, icon, title, text, keys)
  end

  def separator
    {:separator => true}
  end

  def definition
    unless @loaded
      load_overrides
      @loaded = true
    end
    
    @definition
  end

  private

  def extension_classes
    return [] if self.class.name.nil?

    Vmdb::Plugins.instance.vmdb_plugins.collect do |plugin|                                            
      name = plugin.root.join(
        'app/toolbar_overrides',
        self.class.name.to_s.split('::').last.underscore
      )
      name = "#{name}.rb"
      if File.exist?(name)
        require name
        instance = [plugin.class.name.sub('::Engine',''), 'Toolbar', self.class.name.to_s.split('::').last].join('::')
        instance.constantize
      end
    end.compact
  end

  def load_overrides
    extension_classes.each do |klass|
      @definition.merge!(klass.definition)
    end
  end

  def initialize
    @loaded = false
    @definition = {}
  end

  def generic_button(type, id, icon, title, text, keys)
    if text.kind_of?(Hash)
      keys = text
      text = title
    end
    {
      :type  => type,
      :id    => id.to_s,
      :icon  => icon,
      :title => title,
      :text  => text
    }.merge(keys)
  end
end

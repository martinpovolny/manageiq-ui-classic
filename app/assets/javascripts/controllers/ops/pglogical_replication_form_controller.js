ManageIQ.angular.app.controller('pglogicalReplicationFormController', ['$http', '$scope', 'pglogicalReplicationFormId', 'miqService', '$q', '$timeout', function($http, $scope, pglogicalReplicationFormId, miqService, $q, $timeout) {
  var init = function() {
    $scope.pglogicalReplicationModel = {
      replication_type: 'none',
      subscriptions: [],
      addEnabled: false,
      updateEnabled: false,
    };
    $scope.formId = pglogicalReplicationFormId;
    $scope.afterGet = false;
    $scope.modelCopy = angular.copy( $scope.pglogicalReplicationModel );

    ManageIQ.angular.scope = $scope;
    $scope.model = 'pglogicalReplicationModel';
    $scope.newRecord = false;

    miqService.sparkleOn();
    $http.get('/ops/pglogical_subscriptions_form_fields/' + pglogicalReplicationFormId)
      .then(getPgLogicalFormData)
      .catch(miqService.handleFailure);
  };

  var pglogicalManageSubscriptionsButtonClicked = function(buttonName, serializeFields) {
    miqService.sparkleOn();
    var url = '/ops/pglogical_save_subscriptions/' + pglogicalReplicationFormId + '?button=' + buttonName;
    return $q.when(miqJqueryRequest(url, {data: serializeFields, complete: true}))
      .then(function() {
        $scope.modelCopy = angular.copy( $scope.pglogicalReplicationModel );
        $scope.angularForm.$setPristine();
      });
  };

  $scope.resetClicked = function() {
    $scope.pglogicalReplicationModel = angular.copy( $scope.modelCopy );
    $scope.angularForm.$setUntouched(true);
    $scope.angularForm.$setPristine(true);
    miqService.miqFlash('warn', __('All changes have been reset'));
  };

  $scope.saveClicked = function() {
    // remove existing subscriptions that have not changed before sending them up for save
    var modified_subscriptions = $scope.pglogicalReplicationModel.subscriptions.filter(function(subscription, index) {
      if (! subscription.id) { // new
        return true;
      }

      if (subscription.remove) { // removed
        return true;
      }

      if (subscriptionChanged(subscription, $scope.modelCopy.subscriptions[index])) { // modified
        return true;
      }

      return false;
    });
    pglogicalManageSubscriptionsButtonClicked('save', {
      'replication_type': $scope.pglogicalReplicationModel.replication_type,
      'subscriptions': modified_subscriptions,
    });
  };

  // check if subscription values have been changed
  var subscriptionChanged = function(new_subscription, original_subscription) {
    if (new_subscription.dbname   === original_subscription.dbname &&
        new_subscription.host     === original_subscription.host &&
        new_subscription.user     === original_subscription.user &&
        new_subscription.password === original_subscription.password &&
        new_subscription.port     === original_subscription.port) {
      return false;
    }
    return true;
  };

  // replication type changed, show appropriate flash message
  $scope.replicationTypeChanged = function() {
    miqService.miqFlashClear();
    var original_value = $scope.modelCopy.replication_type;
    var new_value      = $scope.pglogicalReplicationModel.replication_type;
    if (original_value === 'none' && new_value === 'none') {
      miqService.miqFlash('warn', __('No replication role has been set'));
    } else if (original_value === 'remote' && new_value === 'none') {
      miqService.miqFlash('warn', __('Replication will be disabled for this region'));
    } else if (original_value === 'global' && new_value === 'none') {
      miqService.miqFlash('warn', __('All current subscriptions will be removed'));
    } else if (original_value === 'global' && new_value === 'remote') {
      miqService.miqFlash('warn', __('Changing to remote replication role will remove all current subscriptions'));
    }

    if (new_value !== 'global') {
      $scope.pglogicalReplicationModel.subscriptions = [];
    }

    if (new_value === 'global' && original_value === 'global') {
      $scope.pglogicalReplicationModel.subscriptions = angular.copy($scope.modelCopy.subscriptions);
    }
  };

  // add new subscription button pressed
  $scope.enableSubscriptionAdd = function() {
    $scope.pglogicalReplicationModel.updateEnabled = false;
    $scope.pglogicalReplicationModel.addEnabled    = true;
    $scope.pglogicalReplicationModel.dbname        = 'vmdb_production';
    $scope.pglogicalReplicationModel.host          = '';
    $scope.pglogicalReplicationModel.user          = '';
    $scope.pglogicalReplicationModel.password      = '';
    $scope.pglogicalReplicationModel.port          = '5432';
  };

  // update existing subscription button pressed
  $scope.enableSubscriptionUpdate = function(idx) {
    var subscription = $scope.pglogicalReplicationModel.subscriptions[idx];
    if (subscription.newRecord === true) {
      $scope.pglogicalReplicationModel.s_index       = idx;
      $scope.pglogicalReplicationModel.updateEnabled = true;
      $scope.pglogicalReplicationModel.dbname        = subscription.dbname;
      $scope.pglogicalReplicationModel.host          = subscription.host;
      $scope.pglogicalReplicationModel.user          = subscription.user;
      $scope.pglogicalReplicationModel.password      = subscription.password;
      $scope.pglogicalReplicationModel.port          = subscription.port;
    } else if (confirm(__('An updated subscription must point to the same database with which it was originally created. Failure to do so will result in undefined behavior. Do you want to continue?'))) {
      $scope.pglogicalReplicationModel.s_index       = idx;
      $scope.pglogicalReplicationModel.updateEnabled = true;
      $scope.pglogicalReplicationModel.dbname        = subscription.dbname;
      $scope.pglogicalReplicationModel.host          = subscription.host;
      $scope.pglogicalReplicationModel.user          = subscription.user;
      $scope.pglogicalReplicationModel.password      = miqService.storedPasswordPlaceholder;
      $scope.pglogicalReplicationModel.port          = subscription.port;
    }
  };

  // add new subscription
  $scope.addSubscription = function(idx) {
    if (typeof idx === 'undefined') {
      $scope.pglogicalReplicationModel.subscriptions.push({
        dbname: $scope.pglogicalReplicationModel.dbname,
        host: $scope.pglogicalReplicationModel.host,
        user: $scope.pglogicalReplicationModel.user,
        password: $scope.pglogicalReplicationModel.password,
        port: $scope.pglogicalReplicationModel.port,
        newRecord: true,
      });
    } else {
      var subscription      = $scope.pglogicalReplicationModel.subscriptions[idx];
      subscription.dbname   = $scope.pglogicalReplicationModel.dbname;
      subscription.host     = $scope.pglogicalReplicationModel.host;
      subscription.user     = $scope.pglogicalReplicationModel.user;
      subscription.port     = $scope.pglogicalReplicationModel.port;
    }
    $scope.pglogicalReplicationModel.addEnabled = false;
    $scope.pglogicalReplicationModel.updateEnabled = false;
  };

  // delete an existing subscription
  $scope.removeSubscription = function(idx) {
    var subscription = $scope.pglogicalReplicationModel.subscriptions[idx];
    if (subscription.newRecord === true) {
      $scope.pglogicalReplicationModel.subscriptions.splice(idx, 1);
      if (angular.equals($scope.pglogicalReplicationModel.subscriptions, $scope.modelCopy.subscriptions)) {
        $scope.angularForm.$setPristine(true);
      }
    } else if (confirm(__('Deleting a subscription will remove all replicated data which originated in the selected region. Do you want to continue?'))) {
      subscription.remove = true;
    }
  };

  // discard new subscription add
  $scope.discardSubscription = function(idx) {
    if (typeof idx === 'undefined') {
      $scope.pglogicalReplicationModel.dbname     = '';
      $scope.pglogicalReplicationModel.host       = '';
      $scope.pglogicalReplicationModel.user       = '';
      $scope.pglogicalReplicationModel.password   = '';
      $scope.pglogicalReplicationModel.port       = '';
      $scope.pglogicalReplicationModel.addEnabled = false;
    } else {
      var original_values = $scope.modelCopy.subscriptions[idx];
      var subscription    = $scope.pglogicalReplicationModel.subscriptions[idx];
      $scope.pglogicalReplicationModel.updateEnabled = false;
      subscription.dbname   = original_values.dbname;
      subscription.host     = original_values.host;
      subscription.user     = original_values.user;
      subscription.password = original_values.password;
      subscription.port     = original_values.port;
    }
  };

  // validate subscription, all required fields should have data
  $scope.subscriptionValid = function() {
    if (typeof $scope.pglogicalReplicationModel.dbname   !== 'undefined' && $scope.pglogicalReplicationModel.dbname   !== '' &&
        typeof $scope.pglogicalReplicationModel.host     !== 'undefined' && $scope.pglogicalReplicationModel.host     !== '' &&
        typeof $scope.pglogicalReplicationModel.user     !== 'undefined' && $scope.pglogicalReplicationModel.user     !== '' &&
        typeof $scope.pglogicalReplicationModel.password !== 'undefined' && $scope.pglogicalReplicationModel.password !== ''
    ) {
      return true;
    }
    return false;
  };

  $scope.saveEnabled = function(form) {
    var saveable = false;
    if ($scope.pglogicalReplicationModel.replication_type !== 'remote') {
      saveable = form.$dirty && form.$valid && !$scope.pglogicalReplicationModel.addEnabled && !$scope.pglogicalReplicationModel.updateEnabled;
      // also need to enable save button when an existing subscriptions was deleted
      var subscriptions_changed = angular.equals($scope.pglogicalReplicationModel.subscriptions, $scope.modelCopy.subscriptions);

      if ((saveable || !subscriptions_changed) &&
        $scope.pglogicalReplicationModel.replication_type === 'global' &&
        $scope.pglogicalReplicationModel.subscriptions.length >= 1) {
        return true;
      } else if (saveable &&
        $scope.pglogicalReplicationModel.replication_type !== 'global' &&
        $scope.pglogicalReplicationModel.subscriptions.length === 0) {
        return true;
      }

      return false;
    }
    return form.$dirty && form.$valid;
  };

  // method to set flag to disable certain buttons when add of subscription in progress
  $scope.addInProgress = function() {
    if ($scope.pglogicalReplicationModel.addEnabled === true) {
      return true;
    }
    return false;
  };

  // validate new/existing subscription
  $scope.validateSubscription = function(idx) {
    var data = {};
    if (typeof idx === 'undefined') {
      data.dbname = $scope.pglogicalReplicationModel.dbname;
      data.host     = $scope.pglogicalReplicationModel.host;
      data.user = $scope.pglogicalReplicationModel.user;
      data.password = $scope.pglogicalReplicationModel.password;
      data.port     = $scope.pglogicalReplicationModel.port;
    } else {
      var subscription = $scope.pglogicalReplicationModel.subscriptions[idx];
      data.dbname = subscription.dbname;
      data.host     = subscription.host;
      data.user = subscription.user;
      data.password = subscription.password;
      data.port     = subscription.port;
      data.id = subscription.id;
    }
    miqService.sparkleOn();
    var url = '/ops/pglogical_validate_subscription';
    miqService.miqAjaxButton(url, data);
  };

  // cancel delete button should be displayed only if existing saved subscriptions were deleted
  $scope.showCancelDelete = function(idx) {
    var subscription = $scope.pglogicalReplicationModel.subscriptions[idx];
    // only show subscriptions in red if they were saved subscriptions and deleted in current edit session
    if (subscription.remove === true) {
      return true;
    }
    return false;
  };

  // put back subscription that was deleted into new subscriptions array
  $scope.cancelDelete = function(idx) {
    var subscription = $scope.pglogicalReplicationModel.subscriptions[idx];
    delete subscription.remove;
  };

  $scope.showChanged = function(idx, fieldName) {
    var original_values = $scope.modelCopy.subscriptions[idx];
    var subscription;
    // if updating a record use form fields to compare
    if ($scope.pglogicalReplicationModel.updateEnabled) {
      subscription = {};
      subscription.dbname  = $scope.pglogicalReplicationModel.dbname;
      subscription.host     = $scope.pglogicalReplicationModel.host;
      subscription.user     = $scope.pglogicalReplicationModel.user;
      subscription.password = $scope.pglogicalReplicationModel.password;
      subscription.port     = $scope.pglogicalReplicationModel.port;
    } else {
      subscription = $scope.pglogicalReplicationModel.subscriptions[idx];
    }

    if (typeof original_values !== 'undefined' && original_values[fieldName] !== subscription[fieldName]) {
      return true;
    }
    return false;
  };

  $scope.subscriptionInValidMessage = function() {
    if ($scope.pglogicalReplicationModel.replication_type === 'global' &&
      ($scope.pglogicalReplicationModel.subscriptions.length === 0 ||
      ($scope.pglogicalReplicationModel.subscriptions.length === 1 && $scope.pglogicalReplicationModel.subscriptions[0].remove === true))) {
      return true;
    }
    return false;
  };


  function getPgLogicalFormData(response) {
    var data = response.data;

    $scope.pglogicalReplicationModel.replication_type = data.replication_type;
    $scope.pglogicalReplicationModel.subscriptions = angular.copy(data.subscriptions);

    if ($scope.pglogicalReplicationModel.replication_type === 'none') {
      miqService.miqFlash('warn', __('No replication role has been set'));
    }

    $scope.afterGet = true;
    $scope.modelCopy = angular.copy( $scope.pglogicalReplicationModel );
    miqService.sparkleOff();

    $timeout(function() {
      $scope.codeMirrorRefresh = true;
    });
  }

  init();
}]);

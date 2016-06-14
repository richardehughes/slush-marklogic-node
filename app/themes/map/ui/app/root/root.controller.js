(function () {
  'use strict';

  angular.module('app.root')
    .factory('rootUtils', RootUtilsFactory)
    .controller('RootCtrl', RootCtrl)
    .filter('isObject', function() {
      return function(val) {
        return angular.isObject(val);
      };
    })
    .filter('isArray', function() {
      return function(val) {
        return angular.isArray(val);
      };
    });

  function RootUtilsFactory() {
    var service = {}, width = window.innerWidth;

    service.isMobile = function() {
      return service.isXS() || service.isSM();
    };

    service.isXS = function() {
      return width < 768; // match boostrap xs
    };

    service.isSM = function() {
      return width < 992; // match bootrap sm
    };

    service.controlsAreShown = !service.isMobile();

    service.toggleControls = function() {
      service.controlsAreShown = !service.controlsAreShown;
    };

    service.hideControls = function() {
      service.controlsAreShown = false;
    };

    service.showControls = function() {
      service.controlsAreShown = true;
    };

    return service;
  }

  RootCtrl.$inject = ['messageBoardService', 'userService', '$scope', '$rootScope',
    '$templateRequest', '$compile', 'rootUtils', 'MLUiGmapManager', 'uiGmapGoogleMapApi'];

  function RootCtrl(messageBoardService, userService, $scope,
    $rootScope, $templateRequest, $compile, rootUtils, mlMapManager, $googleMapsApi) {

    var ctrl = this;
    ctrl.currentYear = new Date().getUTCFullYear();
    ctrl.messageBoardService = messageBoardService;

    $scope.$watch(userService.currentUser, function(newValue) {
      ctrl.currentUser = newValue;
    });

    var miw = window.jQuery('#app-mobile-info-window').get(0); // FIXME: use angular.element?
    var miwscope = $rootScope.$new(), mobileWin;
    var pixelOffset,shownMarker;
    var $googleMaps = null;

    $googleMapsApi.then(function($gMaps) {
      $googleMaps = $gMaps;
    });

    ctrl.mapManager = mlMapManager;

    ctrl.isMobile = rootUtils.isMobile();

    if (ctrl.isMobile) {
      // compile the info window template
      // FIXME: can we use ng-include somehow? or the compile directive?
      $templateRequest('app/map/infoWindow.html').then(function(html) {
        var fn = $compile(html);
        var ele = fn(miwscope);
        miw.appendChild(ele[0]); // compile the template once, and we'll just update the scope
      });
    }

    // FIXME: can we make more use of ui-gmap-window nested inside ui-gmap-markers directive?
    //        Alternatively, push away part of this code into a service. RootUtils perhaps?
    ctrl.markerClick = function(inst,evt,marker) {
      if (!$googleMaps) {
        return;
      }

      if (!pixelOffset) {
        pixelOffset = new $googleMaps.Size(0, -30);
        ctrl.infoWindow.options = { pixelOffset: pixelOffset };
      }

      var lat = inst.getPosition().lat() + 20;
      var lng = inst.getPosition().lng();
      var position = new $googleMaps.LatLng(lat, lng, true);

      if (!marker.content) {
        inst.map.setCenter(position);
      } else if (rootUtils.isMobile()) {
        if (!mobileWin) {
          mobileWin = new $googleMaps.InfoWindow({ content: '<span>' + marker.title + '</span>' });
          google.maps.event.addListener(mobileWin, 'closeclick', function() {
            miwscope.parameter.showMe = false;
            shownMarker = null;
            $scope.$apply();
          });
        } else {
          mobileWin.setContent('<span>' + marker.title + '</span>');
        }
        var shown = (shownMarker !== marker.title);
        if (shown) {
          mobileWin.open(inst.getMap(), inst);
        } else {
          mobileWin.close();
        }
        // for mobile we show our own window
        miwscope.parameter = marker.content;
        miwscope.parameter.showMe = shown;
        shownMarker = marker.title;
        inst.map.setCenter(position);

      } else {

        // otherwise manipulate the google map infowindow
        if (ctrl.infoWindow.shown) {
          ctrl.infoWindow.shown = false;
        } else {
          ctrl.infoWindow.coords = {
            latitude: marker.location.latitude,
            longitude: marker.location.longitude
          };
          ctrl.infoWindow.shown = true;
          ctrl.infoWindow.data = marker.content;
          inst.map.setCenter(position);
        }
      }
    };

    ctrl.closeClick = function() {
      ctrl.infoWindow.shown = false;
    };

    ctrl.infoWindow = {
      shown: false,
      templateUrl: 'app/map/infoWindow.html'
    };

  }
}());

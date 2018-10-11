/**
 * Licensed to The Apereo Foundation under one or more contributor license
 * agreements. See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 *
 * The Apereo Foundation licenses this file to you under the Educational
 * Community License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License
 * at:
 *
 *   http://opensource.org/licenses/ecl2.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 */
/*jslint browser: true, nomen: true*/
/*global define*/
define(["jquery", "backbone", "basil", "engage/core"], function($, Backbone, Basil, Engage) {
    "use strict";

    var insertIntoDOM = false;
    var PLUGIN_NAME = "Engage Plugin Custom X5gon";
    var PLUGIN_TYPE = "engage_custom";
    var PLUGIN_VERSION = "1.0";
    var PLUGIN_TEMPLATE_DESKTOP = "none";
    var PLUGIN_TEMPLATE_MOBILE = "none";
    var PLUGIN_TEMPLATE_EMBED = "none";
    var PLUGIN_STYLES_DESKTOP = [
        "styles/cookieconsent2-3.1.0-min.css"
    ];
    var PLUGIN_STYLES_EMBED = [
        "styles/cookieconsent2-3.1.0-min.css"
    ];
    var PLUGIN_STYLES_MOBILE = [
        "styles/cookieconsent2-3.1.0-min.css"
    ];

    var basilOptions = {
      namespace: 'mhStorage'
    };
    Basil = new window.Basil(basilOptions);

    var plugin;
    var events = {
        plugin_load_done: new Engage.Event("Core:plugin_load_done", "", "handler"),
        customNotification: new Engage.Event('Notification:customNotification', 'a custom message', 'trigger'),
        mediaPackageModelError: new Engage.Event("MhConnection:mediaPackageModelError", "", "handler"),
        mediaPackageLoaded: new Engage.Event("MhConnection:mediaPackageLoaded", "A mediapackage has been loaded", "trigger"),
        play: new Engage.Event('Video:play', 'plays the video', 'both'),
        pause: new Engage.Event('Video:pause', 'pauses the video', 'both'),
        seek: new Engage.Event('Video:seek', 'seek video to a given position in seconds', 'both'),
        ended: new Engage.Event('Video:ended', 'end of the video', 'trigger'),
        fullscreenEnable: new Engage.Event('Video:fullscreenEnable', 'go to fullscreen', 'handler'),
        playbackRateChanged: new Engage.Event('Video:playbackRateChanged', 'The video playback rate changed', 'handler'),
        qualitySet: new Engage.Event('Video:qualitySet', '', 'handler'),
        focusVideo: new Engage.Event('Video:focusVideo', 'increases the size of one video', 'handler'),
        resetLayout: new Engage.Event('Video:resetLayout', 'resets the layout of the videodisplays', 'handler'),
        zoomChange: new Engage.Event('Video:zoomChange', 'zoom level has changed', 'trigger'),
        volumeSet: new Engage.Event('Video:volumeSet', 'set the volume', 'handler')
    };

    var isDesktopMode = false,
        isEmbedMode = false,
        isMobileMode = false,
        translations = [],
        storage_tracking_permission = "x5gon_tracking",
        trackingPermission,
        tracked = false;

    // desktop, embed and mobile logic
    switch (Engage.model.get("mode")) {
        case "embed":
            plugin = {
                insertIntoDOM: insertIntoDOM,
                name: PLUGIN_NAME,
                type: PLUGIN_TYPE,
                version: PLUGIN_VERSION,
                styles: PLUGIN_STYLES_EMBED,
                template: PLUGIN_TEMPLATE_EMBED,
                events: events
            };
            isEmbedMode = true;
            break;
        case "mobile":
            plugin = {
                insertIntoDOM: insertIntoDOM,
                name: PLUGIN_NAME,
                type: PLUGIN_TYPE,
                version: PLUGIN_VERSION,
                styles: PLUGIN_STYLES_MOBILE,
                template: PLUGIN_TEMPLATE_MOBILE,
                events: events
            };
            isMobileMode = true;
            break;
        case "desktop":
        default:
            plugin = {
                insertIntoDOM: insertIntoDOM,
                name: PLUGIN_NAME,
                type: PLUGIN_TYPE,
                version: PLUGIN_VERSION,
                styles: PLUGIN_STYLES_DESKTOP,
                template: PLUGIN_TEMPLATE_DESKTOP,
                events: events
            };
            isDesktopMode = true;
            break;
    }

    /* don't change these variables */

    var token,
        mediapackageError = false,
        allow_tracking = true,
        path,
        storedConsent = Basil.get(storage_tracking_permission);

    allow_tracking = ! isDoNotTrackStatus();

    if (allow_tracking) {
      var translations = [];
      var path = Engage.getPluginPath('EngagePluginControls').replace(/(\.\.\/)/g, '');

      // load x5gon lib from remote server
      require(["https://platform.x5gon.org/api/v1/snippet/latest/x5gon-log.min.js"], function(x5gon) {
        Engage.log("x5gon: external x5gon snippet loaded");

              // load cookieconsent lib from remote server
        require(["https://cdnjs.cloudflare.com/ajax/libs/cookieconsent2/3.1.0/cookieconsent.min.js"], function(cookieconsent) {
          Engage.log("x5gon: external cookie consent lib loaded");

          var mediapackage = Engage.model.get("mediaPackage");
          initConfig(function () {
            initTranslate(Engage.model.get("language"), function () {
                Engage.log('X5gon: Successfully translated.');
                  if (mediapackage && mediapackage.get("ready")) {
                    initTracker(mediapackage);
                  }
            }, function () {
              Engage.log('X5gon: Error translating...');
                if (mediapackage && mediapackage.get("ready")) {
                  initTracker(mediapackage);
                }
            });


            Engage.on(plugin.events.mediaPackageModelError.getName(), function() {
              mediapackageError = true;
            });

            Engage.on(plugin.events.mediaPackageLoaded.getName(), function() {
              mediapackage = Engage.model.get("mediaPackage");
              if (mediapackage && mediapackage.get("ready")) {
                initTracker(mediapackage);
              }
            });
          }, function () {
            Engage.log("X5gon: configuration could not be loaded");
          });
        });
      });

      Engage.log("X5gon: Init");
    } else {
      Engage.log("X5gon: tracking deactivated becasue of Do not track or missing consent");
    }

    function initTracker(mediapackage) {
      // Make sure to abort if no creative commons license can be found.
      if (mediapackageError) return;
      try {
        if (! mediapackage.attributes["search-results"].result.dcLicense.startsWith("CC-")) return;
      } catch(e) {
        return;
      }

      Engage.log('X5gon: init tracker and notification.');
      window.cookieconsent.initialise({
        "palette": {
          "popup": {
            "background": "#3c404d",
            "text": "#d6d6d6"
          },
          "button": {
            "background": "#8bed4f"
          }
        },
        "type": "opt-in",
        "content": {
          "message": translate('x5_message', "On this site the X5gon service can be included, to provide personalized Open Educational Ressources."),
          "allow": translate('x5_accept', "Accept"),
          "deny": translate('x5_deny', "Deny"),
          "link": translate('x5_more_info', "More information"),
          "href": window.location.origin + '/engage/theodul/' + path + translate("x5_policy", "info/x5gon-policy-en-US") + ".html"
        },
        onInitialise: function (status) {
          var type = this.options.type;
          var didConsent = this.hasConsented();
          if (type == 'opt-in' && didConsent) {
            setTrackingPermission(true);
          }
          if (type == 'opt-out' && !didConsent) {
            setTrackingPermission(false);
          }
        },
        onStatusChange: function(status, chosenBefore) {
          var type = this.options.type;
          var didConsent = this.hasConsented();
          if (type == 'opt-in' && didConsent) {
            setTrackingPermission(true);
          }
          if (type == 'opt-out' && !didConsent) {
            setTrackingPermission(false);
          }
        },
        onRevokeChoice: function() {
          var type = this.options.type;
          if (type == 'opt-in') {
            setTrackingPermission(true);
          }
          if (type == 'opt-out') {
            setTrackingPermission(false);
          }
        }
      });

      trackX5gon();
    }

    function initTranslate(language, funcSuccess, funcError) {
      path = Engage.getPluginPath('EngagePluginCustomX5gon').replace(/(\.\.\/)/g, '');
      /* this solution is really bad, fix it... */
      var jsonstr = window.location.origin + '/engage/theodul/' + path;

      Engage.log('X5gon: selecting language ' + language);
      jsonstr += 'language/' + language + '.json';
      $.ajax({
        url: jsonstr,
        dataType: 'json',
        success: function (data) {
          if (data) {
            data.value_locale = language;
            translations = data;
            if (funcSuccess) {
              funcSuccess(translations);
            }
          } else if (funcError) {
            funcError();
          }
        },
        error: function () {
          if (funcError) {
            funcError();
          }
        }
      });
    }

    function initConfig(funcSuccess, funcError) {
      path = Engage.getPluginPath('EngagePluginCustomX5gon').replace(/(\.\.\/)/g, '');
      /* this solution is really bad, fix it... */
      var jsonstr = window.location.origin + '/engage/theodul/' + path;

      Engage.log('x5gon: loading config.' );
      jsonstr += 'conf/x5gon.json';
      $.ajax({
        url: jsonstr,
        dataType: 'json',
        success: function (data) {
          if (data) {
            token = data["x5_token"];
            if (funcSuccess) {
              funcSuccess(translations);
            }
          } else if (funcError) {
            funcError();
          }
        },
        error: function () {
          if (funcError) {
            funcError();
          }
        }
      });
    }

    function translate(str, strIfNotFound) {
      return (translations[str] != undefined) ? translations[str] : strIfNotFound;
    }

    function trackX5gon() {
      if (isTrackingPermission() && ! tracked) {
        if (! token) {
          Engage.log("X5gon: token missing!");
        } else {
          x5gonActivityTracker(token);
          tracked = true;
          Engage.log("X5gon: send data to X5gon servers");
        }
      }
    }

    function isDoNotTrackStatus() {
      if (window.navigator.doNotTrack == 1 || window.navigator.msDoNotTrack == 1 ) {
        return true;
      }
      return false;
    }

    function isTrackingPermission() {
      if (isDoNotTrackStatus()) return false;
      if (trackingPermission === undefined) {
        trackingPermission = storedConsent;
        if (trackingPermission === undefined) {
          return false;
        }
      }
      return trackingPermission;
    }

    function setTrackingPermission(status) {
      Basil.set(status);
      storedConsent = status;
      trackingPermission = status;
      trackX5gon();
    }

    return plugin;
});

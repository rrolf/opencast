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
define(["jquery", "underscore", "backbone", "basil", "engage/core"], function($, _, Backbone, Basil, Engage) {

    var insertIntoDOM = true;
    var PLUGIN_NAME = "Zoom Logging";
    var PLUGIN_TYPE = "engage_custom";
    var PLUGIN_VERSION = "1.0";

    var eventID,
        basilOptions = {
        namespace: "mhStorage"
    };
    Basil = new window.Basil(basilOptions);

    var plugin,
        timer,
        delay = 250,
        activeFlavor,
        activeVideoNumber;

    var events = {
          moveHorizontal: new Engage.Event('Video:moveHorizontal', 'move video horizontal', 'handler'),
          moveVertical: new Engage.Event('Video:moveVertical', 'move video vertical', 'handler'),
          zoomChange: new Engage.Event('Video:zoomChange', 'zoom level has changed', 'trigger')
    };

    var isDesktopMode = false,
        isEmbedMode = false,
        isMobileMode = false;

    // desktop, embed and mobile logic
    switch (Engage.model.get("mode")) {
        case "embed":
            plugin = {
                insertIntoDOM: insertIntoDOM,
                name: PLUGIN_NAME,
                type: PLUGIN_TYPE,
                version: PLUGIN_VERSION,
                styles: "",
                template: "none",
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
                styles: "",
                template: "none",
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
                styles: "",
                template: "none",
                events: events
            };
            isDesktopMode = true;
            break;
    }

    var relative_plugin_rest_endpoint; // will contain the relative path to this plugins REST interface


    function delayedLogging() {
        clearTimeout(timer);
        timer = setTimeout(logAction, delay);
    }

    function logAction() {
        console.log("Trying to log zoom");
        if (! eventID) {
          if (Engage && Engage.model && Engage.model.get('mediaPackage'))
            eventID = Engage.model.get('mediaPackage').get('eventid');
          else {
            console.log("could not get EventID");
            return;
          }
        }

        var tmpActiveFlavor,
            tmpActiveVideoNumber,
            playTime,
            scale,
            posX,
            posY,
            source;

        for (var i = 0; i < $("video").length; i++) {

          var currentScale;
          if ($("video")[i].style.transform)
            currentScale = parseFloat($("video")[i].style.transform.split("(")[1].split(")")[0]);
          else currentScale = 1.0;
          if (currentScale > 1.0) {
            scale = currentScale;
            if (! $("video")[i].flavor) {
              $("video")[i].flavor = $("video")[i].id.split("_", 3)[2];
            }
            tmpActiveFlavor = $("video")[i].flavor;
            tmpActiveVideoNumber = i;
            playTime = $("video")[i].currentTime;
            source = $("video")[i].src;
            var left = parseInt($("video")[i].style.left),
                top = parseInt($("video")[i].style.top),
                height = parseInt($("video")[i].offsetHeight),
                width = parseInt($("video")[i].offsetWidth),
                overlapWidth = (width * scale) - width,
                overlapHeight = (height * scale) - height;
            posX = 1.0 - (((overlapWidth / 2) + left) / overlapWidth);
            posY = 1.0 - (((overlapHeight / 2) + top) / overlapHeight);
          }
        }

        if (! tmpActiveFlavor) {
          playTime = $("video")[0].currentTime;
          scale = 1.0;
          posX = 0.5;
          posY = 0.5;
          source = $("video")[activeVideoNumber].src;
        } else {
          activeFlavor = tmpActiveFlavor;
          activeVideoNumber = tmpActiveVideoNumber;
        }

        $.ajax({
            type:"POST",
            url:"engage/theodul/" + relative_plugin_rest_endpoint + "logging",
            data: {
                event: eventID,
                flavor: activeFlavor,
                play_time: parseFloat(playTime).toFixed(2),
                scale: scale,
                pos_x: posX.toFixed(4),
                pos_y: posY.toFixed(4),
                source: source
            }
        });
    }

    function initPlugin() {
        Engage.log("Custom:Zoom Logging: initPlugin()");
        // get the REST endpoint:
        relative_plugin_rest_endpoint = relative_plugin_path.replace("static","rest");

        Engage.on(plugin.events.zoomChange.getName(), function() {
          delayedLogging();
        });
        Engage.on(plugin.events.moveHorizontal.getName(), function() {
          delayedLogging();
        });
        Engage.on(plugin.events.moveVertical.getName(), function() {
          delayedLogging();
        });
    }

    // #####################   STARTING THE PLUGIN   ########################

    if (isDesktopMode) {
        var relative_plugin_path = Engage.getPluginPath("EngagePluginLogging");
        initPlugin();
    }

    return plugin;
});

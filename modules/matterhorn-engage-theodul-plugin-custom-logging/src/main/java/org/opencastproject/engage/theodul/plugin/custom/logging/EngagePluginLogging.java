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

package org.opencastproject.engage.theodul.plugin.custom.logging;

import org.opencastproject.engage.theodul.api.AbstractEngagePlugin;
import org.opencastproject.engage.theodul.api.EngagePluginRestService;

import org.osgi.service.component.ComponentContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.Consumes;
import javax.ws.rs.FormParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Path("/")
public class EngagePluginLogging extends AbstractEngagePlugin implements EngagePluginRestService {

    private static final Logger log = LoggerFactory.getLogger(EngagePluginLogging.class);

    protected void activate(ComponentContext cc) {
        log.info("Activated engage plugin: Logging.");
    }

    @POST
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.TEXT_PLAIN)
    @Path("logging")
    public String logging(@FormParam("event") String event,
                          @FormParam("flavor") String flavor,
                          @FormParam("play_time") String playTime,
                          @FormParam("scale") String scale,
                          @FormParam("pos_x") String posX,
                          @FormParam("pos_y") String posY,
                          @FormParam("source") String source) {
        /* // writing a log entry: */
        log.info("EventID: " + event
            + ", Flavor: " + flavor
            + ", Play Time: " + playTime
            + ", Scale: " + scale
            + ", X: " + posX
            + ", Y: " + posY
            + ", URL: " + source);

        return ""; // empty response is provided since Firefox has problems with handling 204 Response (it trys to parse empty xml)
    }
}

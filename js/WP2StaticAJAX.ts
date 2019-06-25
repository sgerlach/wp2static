declare var ajaxurl: string;

import $ from "jquery";

import { WP2StaticProcessExports } from "./WP2StaticProcessExports";

const wp2staticProcessExports = new WP2StaticProcessExports();

export class WP2StaticAJAX {

    statusText: string;

    /*
        doAJAXExport() can handle from 1 to n actions
        each action runs, with 3 possible results:
        SUCCESS - action is complete
        > 0 - action is in progress inremental task
        ERROR

        if an action is successful, and there are other actions queued up,
        it will call the function again with the remaining arguments/actions

        if an action is succesful, and there are no other actions queued,
        it will call processExportTargets() to continue any other exports

        if an action is in progress incremental, it will call itself again,
        with all the same arguments

        if an action fails, ajaxErrorHandler() is called
        */
      doAJAXExport(
        args,
        statusDescriptions,
        exportTargets,
        deployOptions,
        currentDeploymentMethod,
        siteInfo
      ) {
        let exportAction = args[0];
        let statusText = exportAction;

        if (statusDescriptions[exportAction] !== undefined) {
          statusText = statusDescriptions[exportAction];
        } else {
          statusText = exportAction;
        }

        $("#current_action").html(statusText);
        $(".hiddenActionField").val("wp_static_html_output_ajax");
        $("#hiddenAJAXAction").val(exportAction);

        const data = $(".options-form :input")
          .filter(
            (index, element) => {
              return $(element).val() !== "";
            },
          )
          .serialize();

        $.ajax(
          {
            data,
            dataType: "html",
            error: this.ajaxErrorHandler,
            method: "POST",
            success(serverResponse) {
              // if an action is successful, and there are other actions queued up
              if (serverResponse === "SUCCESS" && args.length > 1) {
                // rm first action now that it's succeeded
                args.shift();
                // call function with all other actions
                this.doAJAXExport(args, statusDescriptions, exportTargets, deployOptions, siteInfo);
                // if an action is in progress incremental, it will call itself again
              } else if (serverResponse > 0) {
                this.doAJAXExport(args, statusDescriptions, exportTargets, deployOptions, siteInfo);
              } else if (serverResponse === "SUCCESS") {
                // not an incremental action, continue on with export targets
                wp2staticProcessExports.processExportTargets(
                  statusDescriptions,
                  exportTargets,
                  deployOptions,
                  currentDeploymentMethod,
                  siteInfo
                );
              } else {
                this.ajaxErrorHandler();
              }
            },
            url: ajaxurl,
          },
        );
    }

    ajaxErrorHandler() {
      // stopTimer();

      const failedDeployMessage = 'Failed during "' + this.statusText +
              '", <button id="downloadExportLogButton">Download export log</button>';

      $("#current_action").html(failedDeployMessage);
      $(".pulsate-css").hide();
      $("#startExportButton").prop("disabled", false);
      $(".saveSettingsButton").prop("disabled", false);
      $(".resetDefaultSettingsButton").prop("disabled", false);
      $(".cancelExportButton").hide();
    }
}
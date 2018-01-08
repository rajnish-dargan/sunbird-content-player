/**
 * Telemetry V3 Library
 * @author Akash Gupta <Akash.Gupta@tarento.com>
 */

var libraryDispatcher = {
    dispatch: function(event){
        var customEvent = new CustomEvent('TelemetryEvent', { detail: event });
        console.log("Telemetry Event ", event);
        document.dispatchEvent(customEvent);
    }
};


var EkTelemetry = (function() {
    this.ektelemetry = function() {};
    var instance = function() {};
    var telemetryInstance = this;
    this.ektelemetry.initialized = false;
    this.ektelemetry.config = {};
    this.ektelemetry._version = "3.0";
    this.dispatcher = libraryDispatcher;
    this.startTime = 0;
    this.newContext = {};
    this._defaultValue = {
        pdata: {
            id: "in.ekstep",
            ver: "1.0",
            pid: ""
        },
        channel: "in.ekstep",
        uid: "anonymous",
        did: "",
        authtoken: "",
        sid: "",
        batchsize: 20,
        host: "https://api.ekstep.in",
        endpoint: "/data/v3/telemetry",
        tags: [],
        cdata: [],
        apislug: "/action",
        env:"ContentPlayer"
    },
    this.telemetryEnvelop = {
        "eid": "",
        "ets": "",
        "ver": "",
        "mid": '',
        "actor": {},
        "context": {},
        "object": "",
        "tags": "",
        "edata": ""
    }
    this.startData = [];
    this.deviceSpecRequiredFields = ["os","make","id","mem","idisk","edisk","scrn","camera","cpu","sims","cap"],
    this.userAgentRequiredFields = ["agent","ver","system","platform","raw"],
    this.objectRequiredFields = ["id","type","ver"],
    this.targetRequiredFields = ["id","type","ver"],
    this.pluginRequiredFields = ["id","ver"],
    this.visitRequiredFields = ["objid","objtype"],
    this.questionRequiredFields = ["id","maxscore","exlength","desc","title"],
    this.pdataRequiredFields = ["id"],
    this.targetObjectRequiredFields = ["type","id"],

    this.ektelemetry.initialize = function(config){
        instance.init(config);
    }
    this.ektelemetry.start = function(config, contentId, contentVer, data, context) {
        if (!instance.hasRequiredData(data, ["type"])) {
            console.error('Invalid start data');
            return;
        }
        if (data.dspec && !instance.hasRequiredData(data.dspec, telemetryInstance.deviceSpecRequiredFields)) {
            console.error('Invalid device spec')
            return;
        }
        if (data.uaspec && !instance.hasRequiredData(data.uaspec, telemetryInstance.userAgentRequiredFields)) {
            console.error('Invalid user agent spec')
            return;
        }
        data.duration = data.duration || (new Date()).getTime();
        contentId && contentVer && (EkTelemetry.config.object = {
                id: contentId,
                ver: contentVer
        });
        if (!EkTelemetry.initialized) {
            instance.init(config, contentId, contentVer, data.type);
        }
        context && instance.updateContext(context);
        var startEventObj = instance.getEvent('START', data);
        instance._dispatch(startEventObj)
        telemetryInstance.startData.push(JSON.parse(JSON.stringify(startEventObj)));

        // Required to calculate the time spent of content while generating OE_END
        EkTelemetry.startTime = startEventObj.ets;
        return startEventObj;

    }

    this.ektelemetry.end = function(data, context) {
        if (!instance.hasRequiredData(data, ["type"])) {
            console.error('Invalid end data. Required fields are missing.', data);
            return;
        }
        if(!EkTelemetry.startTime){
            console.log("Unable to invoke end event, Please invoke start event first. ");
            return;
        }
        if(telemetryInstance.startData.length){
            var startEventObj = telemetryInstance.startData.pop();
            data.duration = ((new Date()).getTime() - startEventObj.ets)
            context && instance.updateContext(context)
            instance._dispatch(instance.getEvent('END', data));
        }else{
            console.info("Please invoke start before invoking end event.")
        }
    }

    this.ektelemetry.impression = function(data, context) {
        if (undefined == data.pageid || undefined == data.type || undefined == data.uri) {
            console.error('Invalid impression data. Required fields are missing.', data);
            return;
        }
        if (data.visits && !instance.hasRequiredData(data.visits, telemetryInstance.visitRequiredFields)) {
            console.error('Invalid visits spec')
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('IMPRESSION', data));
    }

    this.ektelemetry.interact = function(data, context) {
        if (!instance.hasRequiredData(data, ["type", "id"])) {
            console.error('Invalid interact data');
            return;
        }
        if (data.target && !instance.hasRequiredData(data.target, telemetryInstance.targetRequiredFields)) {
            console.error('Invalid target spec')
            return;
        }
        if (data.plugin && !instance.hasRequiredData(data.plugin, telemetryInstance.pluginRequiredFields)) {
            console.error('Invalid plugin spec')
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('INTERACT', data));
    }

    this.ektelemetry.assess = function(data, context) {
        if (!instance.hasRequiredData(data, ["item", "pass", "score", "resvalues", "duration"])) {
            console.error('Invalid assess data');
            return;
        }
        if (!instance.hasRequiredData(data.item, telemetryInstance.questionRequiredFields)) {
            console.error('Invalid question spec')
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('ASSESS', data));
    }

    this.ektelemetry.response = function(data, context) {
        if (!instance.hasRequiredData(data, ["target", "values", "type"])) {
            console.error('Invalid response data');
            return;
        }
        if (!instance.hasRequiredData(data.target, telemetryInstance.targetRequiredFields)) {
            console.error('Invalid target spec')
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('RESPONSE', data));
    }

    this.ektelemetry.interrupt = function(data, context) {
        if (!instance.hasRequiredData(data, ["type"])) {
            console.error('Invalid interrupt data');
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('INTERRUPT', data));
    }

    this.ektelemetry.feedback = function(data, context) {
        var eksData = {
            "rating": data.rating || '',
            "comments": data.comments || ''
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('FEEDBACK', eksData));
    }

    this.ektelemetry.share = function(data, context) {
        if (!instance.hasRequiredData(data, ["items"])) {
            console.error('Invalid share data');
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('INTERRUPT', data));
    }

    this.ektelemetry.audit = function(data, context) {
        if (!instance.hasRequiredData(data, ["props"])) {
            console.error('Invalid audit data');
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('AUDIT', data));
    }

    this.ektelemetry.error = function(data, context) {
        if (!instance.hasRequiredData(data, ["err", "errtype", "stacktrace"])) {
            console.error('Invalid error data');
            return;
        }
        if (data.object && !instance.hasRequiredData(data.object, telemetryInstance.objectRequiredFields)) {
            console.error('Invalid object spec')
            return;
        }
        if (data.plugin && !instance.hasRequiredData(data.plugin, telemetryInstance.pluginRequiredFields)) {
            console.error('Invalid plugin spec')
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('ERROR', data));
    }

    this.ektelemetry.heartbeat = function(data, context) {
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('HEARTBEAT', data));
    }

    this.ektelemetry.log = function(data, context) {
        if (!instance.hasRequiredData(data, ["type", "level", "message"])) {
            console.error('Invalid log data');
            return;
        }
        context && instance.updateContext(context);
        instance._dispatch(instance.getEvent('LOG', data));
    }

    this.ektelemetry.search = function(data, context) {
        if (!instance.hasRequiredData(data, ["query", "size", "topn"])) {
            console.error('Invalid search data');
            return;
        }
        context && instance.updateContext(context)
        instance._dispatch(instance.getEvent('SEARCH', data));
    }

    this.ektelemetry.metrics = function(data, context) {
        context && instance.updateContext(context);
        instance._dispatch(instance.getEvent('METRICS', data));
    }

    this.ektelemetry.exdata = function(data, context) {
        context && instance.updateContext(context);
        instance._dispatch(instance.getEvent('EXDATA', data));
    }

    this.ektelemetry.summary = function(data, context) {
        if (!instance.hasRequiredData(data, ["type", "starttime", "endtime", "timespent","pageviews","interactions"])) {
            console.error('Invalid summary data');
            return;
        }
        context && instance.updateContext(context);
        instance._dispatch(instance.getEvent('SUMMARY', data));
    } 

    this.ektelemetry.isInitialized = function(){
        return EkTelemetry.initialized;
    } 

    this.ektelemetry.resetContext = function(context){
        telemetryInstance.newContext = context || {};
    };

    this.ektelemetry.getCurrentContext = function(){
        return telemetryInstance.newContext
    }  

    instance.init = function(config, contentId, contentVer, type) {
        if (EkTelemetry.initialized) {
            console.log("Telemetry is already initialized..");
            return;
        }
        if(config){
            if (config.pdata && !instance.hasRequiredData(config.pdata, telemetryInstance.pdataRequiredFields)) {
                console.error('Invalid pdata spec in config')
                return;
            }
            if (config.object && !instance.hasRequiredData(config.object, telemetryInstance.targetObjectRequiredFields)) {
                console.error('Invalid target object spec in config')
                return;
            }
        }else{
            config = {}
        }    
        var requiredData = config;
        if(contentId && contentVer){
            requiredData = Object.assign(config, { "contentId": contentId, "contentVer": contentVer, "type": type });
            _defaultValue.object = {
                "id": contentId,
                "ver": contentVer
            }
        }
        if (!instance.hasRequiredData(requiredData, ["pdata", "channel", "uid", "env"])) {
            console.error('Invalid start data');
            EkTelemetry.initialized = false;
            return EkTelemetry.initialized;
        }
        config.batchsize = config.batchsize ? (config.batchsize < 10 ? 10 : (config.batchsize > 1000 ? 1000 : config.batchsize)) : _defaultValue.batchsize;
        EkTelemetry.config = Object.assign(_defaultValue, config);
        EkTelemetry.initialized = true;
        telemetryInstance.dispatcher = EkTelemetry.config.dispatcher ? EkTelemetry.config.dispatcher : libraryDispatcher;
        console.info("Telemetry is initialized.")
    }

    instance._dispatch = function(message) {
        message.mid = message.eid + ':' + CryptoJS.MD5(JSON.stringify(message)).toString();
        dispatcher.dispatch(message);
    }

    instance.getEvent = function(eventId, data) {
        telemetryInstance.telemetryEnvelop.eid =  eventId,
        telemetryInstance.telemetryEnvelop.ets = (new Date()).getTime(),
        telemetryInstance.telemetryEnvelop.ver = EkTelemetry._version,
        telemetryInstance.telemetryEnvelop.mid = '',
        telemetryInstance.telemetryEnvelop.actor = {"id": EkTelemetry.config.uid || 'anonymous', "type": 'User'}, 
        telemetryInstance.telemetryEnvelop.context = Object.assign(instance.getGlobalContext(), EkTelemetry.getCurrentContext())
        telemetryInstance.telemetryEnvelop.object = EkTelemetry.config.object,
        telemetryInstance.telemetryEnvelop.tags = EkTelemetry.config.tags || [],
        telemetryInstance.telemetryEnvelop.edata = data
        return telemetryInstance.telemetryEnvelop;
    }

    instance.hasRequiredData = function(data, mandatoryFields) {
        var isValid = true;
        mandatoryFields.forEach(function(key) {
            if (data) {
                if (!data.hasOwnProperty(key)) isValid = false;
            } else {
                isValid = false
            }
        });
        return isValid;
    }

    instance.getGlobalContext = function() {
        var globalContext = {
            "channel": EkTelemetry.config.channel || telemetryInstance._defaultValue.channel,
            "pdata": EkTelemetry.config.pdata || telemetryInstance._defaultValue.pdata,
            "env": EkTelemetry.config.env || telemetryInstance._defaultValue.env,
            "sid": EkTelemetry.config.sid || telemetryInstance._defaultValue.sid,
            "did": EkTelemetry.config.did || telemetryInstance._defaultValue.did,
            "cdata": EkTelemetry.config.cdata || telemetryInstance._defaultValue.cdata,
            "rollup": EkTelemetry.config.rollup || {}
        }
        return globalContext;
    }

    instance.updateContext = function(context){
        telemetryInstance.newContext = context
    }
    // For device which dont support ECMAScript 6
    instance.objectAssign = function() {
        Object.assign = function(target) {
            'use strict';
            if (target == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }

            target = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var source = arguments[index];
                if (source != null) {
                    for (var key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            target[key] = source[key];
                        }
                    }
                }
            }
            return target;
        }
    }

    if (typeof Object.assign != 'function') {
        instance.objectAssign();
    }

    return this.ektelemetry;
})();

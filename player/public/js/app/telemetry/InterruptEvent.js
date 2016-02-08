InterruptEvent = TelemetryEvent.extend({
    init: function(type, id) {
        this._super();
        this.event.eid = this.name = "OE_INTERRUPT";
        var eventStr = TelemetryService._config.events[this.name];
        if(!_.contains(eventStr.eks.type.values, type)) {
            this.event.edata.ext.type = type;
            type = "OTHER";
        }
        this.event.edata.eks = {
            "type": type,
            "id": id || ''
        };
        this.flush();
    }
})
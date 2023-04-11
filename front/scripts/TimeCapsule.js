export default class TimeCapsule {
    constructor(seconds) {
        this.time = Math.round(seconds);
    }
    set(time) {
        this.time = time;
    }
    getByMinuteObj() {
        let hours = Math.floor(this.time / 3600);
        let minutes = Math.floor((this.time % 3600) / 60);
        let seconds = (this.time % 3600) % 60;

        return {seconds, minutes, hours}
    }
    getByMinute() {
        let obj = this.getByMinuteObj();

        let hours = obj.hours ? ('0' + obj.hours).slice(-2) : null;
        let minutes = ('0' + obj.minutes).slice(-2);
        let seconds = ('0' + obj.seconds).slice(-2);

        return `${hours?hours+":":''}${minutes}:${seconds}`;
    }
}
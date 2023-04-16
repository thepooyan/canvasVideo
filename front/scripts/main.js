import { dc } from "eixes";
import TimeCapsule from "./TimeCapsule";
import $ from 'jquery';

function createEle(className) {
  let ele = document.createElement('div');
  ele.classList.add(className);
  return ele
}

function removeDecimal(number, howMuch) {
  return Math.trunc(number * Math.pow(10, howMuch)) / Math.pow(10, howMuch);
}

class CanvasVideo {
  animationAuthorization = true;
  spentTime = new TimeCapsule(0);
  disapearTime = 1500;
  isDragging = false;
  isPlaying = false;
  hover = {
    amount: 2000,
    timeout: null,
    countdown: () => {
      clearTimeout(this.hover.timeout);
      this.hover.timeout = setTimeout(() => {
        this.hover.hide();
      }, this.hover.amount);
    },
    show: () => {
      this.container.classList.add('hover');
    },
    hide: () => {
      if (!this.isPlaying) return
      this.container.classList.remove('hover');
    }
  };

  constructor(id) {
    this.id = id;
    this.canvas = dc.id(id);
    this.canvasClone = this.canvas.cloneNode();

    this.video = document.createElement('video');
    this.video.style.display = "none";
    this.video.addEventListener('ended', () => { this.finished() });
    document.body.appendChild(this.video);

    $.ajax({
      url: 'http://192.168.1.109:3000/test',
      method: 'POST',
      data: JSON.stringify({ hash: id }),
      contentType: 'application/json',
      success: src => {
        this.video.src = src;
      }
    })
    let checkVideoReady = setInterval(() => {
      if (this.video.readyState > 0) {
        this.wholeTime = new TimeCapsule(this.video.duration);
        this.controlBar.dataset.wholetime = this.wholeTime.getByMinute();
        this.controlBar.dataset.spenttime = this.spentTime.getByMinute();

        this.canvasClone.width = this.video.videoWidth;
        this.canvasClone.height = this.video.videoHeight;

        clearInterval(checkVideoReady)
      }
    }, 200);

    //create container
    this.container = createEle('canvasPlayer');
    this.container.appendChild(this.canvasClone);
    this.hover.show();

    this.container.onmousemove = () => {
      this.hover.show();
      this.hover.countdown();
    }
    this.container.onmouseout = () => {
      this.hover.hide();
    }
    this.container.ondblclick = e => {
      if (this.controlBar.contains(e.target)) return;
      this.toggleFullscreen();
    }
    this.container.onclick = e => {
      this.hover.countdown();
      if (this.controlBar.contains(e.target)) return;
      if (this.isDragging) return;
      this.toggleVideoPlay();
      if (this.isPlaying) {
        this.hover.countdown();
        this.#showNotif({ icon: this.playButton.dataset.icon })
      } else {
        this.hover.show();
        this.#showNotif({ icon: this.playButton.dataset.altIcon })
      }
    }

    //create control bar
    this.controlBar = createEle('controlBar')
    this.container.appendChild(this.controlBar);

    //create progress bar
    this.progressBar = createEle('progressBar')
    this.progressBar.onclick = e => {
      let progress = (e.layerX / this.progressBar.clientWidth) * 100;
      this.jumpVideo({ timestamp: (progress * this.wholeTime.time) / 100 });
      this.progressBar.style.setProperty('--progress', progress);
      if (this.video.paused) {
        this.toggleVideoPlay()
      }
    }
    this.progressBar.onmousedown = e => {
      this.isDragging = true;
      window.addEventListener('mousemove', dragProgressLine);
      window.addEventListener('mouseup', () => {
        window.removeEventListener('mousemove', dragProgressLine);
        this.toggleVideoPlay();
        setTimeout(() => {
          this.isDragging = false;
        }, 0);
      }, { once: true })
    }
    let that = this;
    let lineTouched;
    function dragProgressLine(e) {
      clearTimeout(lineTouched);
      if (!that.video.paused) {
        that.toggleVideoPlay()
      }
      let progress = dragLine(e, that.progressBar)
      let lastProgress;
      that.progressBar.style.setProperty('--progress', progress);

      lineTouched = setTimeout(() => {
        if (progress === lastProgress) return
        that.jumpVideo({ timestamp: (progress * that.wholeTime.time) / 100 });
        lastProgress = progress;
      }, 100);
    }
    function dragLine(event, ele) {
      let rect = ele.getBoundingClientRect();
      let left = rect.left;
      let width = ele.clientWidth;
      let amount = event.clientX - left;
      if (amount < 0) amount = 0;
      if (amount > width) amount = width;
      let percent = removeDecimal(amount / width * 100, 2);
      return percent
    }
    this.controlBar.appendChild(this.progressBar);

    //create buttons
    this.fullscButton = this.#createButton('', this.toggleFullscreen, { className: "fullsc", altIcon: '' });
    this.settingButton = this.#createButton('', null, { className: "setting" });
    this.volumeButton = this.#createButton('', null, { altIcon: '', className: 'volume' });
    this.#createButton('', () => {
      this.#showNotif({ icon: "" });
      this.jumpVideo({ amount: 15 });
    });
    this.#createButton('', () => {
      this.#showNotif({ icon: "" });
      this.jumpVideo({ amount: -15 })
    });
    this.playButton = this.#createButton('', () => {
      let res = this.toggleVideoPlay()
      if (res)
        this.#showNotif({ icon: this.playButton.dataset.icon })
      else
        this.#showNotif({ icon: this.playButton.dataset.altIcon })
    }, { altIcon: '' });

    //volume 
    this.volumeBar = createEle('volumeBar')
    this.volumeBar.onclick = e => {
      let progress = (e.layerX / this.volumeBar.clientWidth) * 100;
      this.changeVolume(progress);
      this.volumeBar.style.setProperty('--progress', progress);
    }
    this.volumeButton.appendChild(this.volumeBar);
    this.volumeButton.onclick = e => {
      if (this.volumeBar.contains(e.target)) return
      this.toggleMute();
    }
    this.volumeBar.onmousedown = e => {

      window.addEventListener('mousemove', volumeDrag);
      window.addEventListener('mouseup', () => {
        window.removeEventListener('mousemove', volumeDrag);
      })
    }
    function volumeDrag(e) {
      let progress = dragLine(e, that.volumeBar);
      if (progress) {
        that.changeVolume(progress)
        that.volumeBar.style.setProperty('--progress', progress);
      }
    }

    //notif part
    this.notif = createEle('notif');
    this.container.appendChild(this.notif);

    //setting menu
    this.settingMenu = document.createElement('div');
    let speeds = [.5, .75, 1, 1.25, 1.5, 1.75, 2];
    speeds = speeds.map(i => {
      let li = document.createElement('li');
      li.innerText = i;
      if (i === 1)
        li.classList.add('active')
      li.onclick = () => {
        this.changeSpeed(i);
        this.#showNotif({ text: i });
        speeds.forEach(item => item.classList.remove('active'));
        li.classList.add('active');
      }
      this.settingMenu.appendChild(li);
      return li
    })
    this.settingButton.appendChild(this.settingMenu);

    this.canvas.replaceWith(this.container);
  }
  //inner methods
  #paintCanvas = () => {
    let context = this.canvasClone.getContext('2d');
    context.drawImage(this.video, 0, 0, this.canvasClone.width, this.canvasClone.height);

    // change the timestamp
    this.spentTime.set(Math.floor(this.video.currentTime));
    this.controlBar.dataset.spenttime = this.spentTime.getByMinute();
    let progress = (this.video.currentTime / this.wholeTime.time) * 100;
    this.progressBar.style.setProperty('--progress', progress);

    if (this.animationAuthorization)
      requestAnimationFrame(this.#paintCanvas);
  }
  #createButton = (icon, onclick, { className, altIcon } = {}) => {
    let button = document.createElement('button');
    button.dataset.icon = icon;
    if (className)
      button.className = className;
    if (altIcon)
      button.dataset.altIcon = altIcon;
    if (typeof onclick === 'function')
      button.onclick = () => { onclick(button) };

    this.controlBar.appendChild(button);
    return button
  }

  //control methods
  #showNotif({ icon, text } = {}) {
    if (icon) {
      this.notif.dataset.icon = icon;
      this.notif.innerText = '';
    }
    if (text) {
      this.notif.dataset.icon = '';
      this.notif.innerText = text;
    }
    this.notif.classList.add('show');
    this.notif.addEventListener('animationend', () => {
      this.notif.classList.remove('show');
    })
  }
  toggleVideoPlay() {
    let result;
    this.playButton.classList.toggle('active');
    if (this.isPlaying) {
      this.video.pause();
      this.animationAuthorization = false;
      result = false;
    } else {
      this.video.play();
      this.animationAuthorization = true;
      this.#paintCanvas();
      result = true;
    }
    this.isPlaying = !this.isPlaying;
  }
  finished() {
    this.toggleVideoPlay();
    this.hover.show();
  }
  toggleFullscreen = () => {
    const openFullscreen = () => {
      let dc = document.documentElement;
      if (dc.requestFullscreen) {
        dc.requestFullscreen();
      } else if (dc.webkitRequestFullscreen) { /* Safari */
        dc.webkitRequestFullscreen();
      } else if (dc.msRequestFullscreen) { /* IE11 */
        dc.msRequestFullscreen();
      }
    }
    const closeFullscreen = () => {
      let dc = document;
      if (dc.exitFullscreen) {
        dc.exitFullscreen();
      } else if (dc.webkitExitFullscreen) { /* Safari */
        dc.webkitExitFullscreen();
      } else if (dc.msExitFullscreen) { /* IE11 */
        dc.msExitFullscreen();
      }
    }
    let isFull = this.fullscButton.classList.toggle('active');
    this.container.classList.toggle('fullscreen');

    if (isFull) {
      openFullscreen();
    } else {
      closeFullscreen();
    }
  }
  jumpVideo = ({ amount, timestamp }) => {
    if (amount)
      this.video.currentTime += amount;
    else if (timestamp)
      this.video.currentTime = timestamp;
    if (this.video.paused) {
      this.#paintCanvas(); //refresh the picutre on the frame
    }
  }
  changeVolume = (amount1_100) => {
    this.video.volume = amount1_100 / 100;
    if (this.video.muted)
      this.toggleMute()
  }
  toggleMute = () => {
    this.volumeButton.classList.toggle('active')
    this.volumeBar.classList.toggle('muted')
    this.video.muted = !this.video.muted;
  }
  changeSpeed(amount) {
    this.video.playbackRate = amount;
  }
}

dc.queries('canvas.video').forEach(canvas => {
  new CanvasVideo(canvas.id);
})
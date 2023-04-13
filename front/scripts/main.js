import { dc } from "eixes";
import TimeCapsule from "./TimeCapsule";
import $ from 'jquery';

function createEle(className) {
  let ele = document.createElement('div');
  ele.classList.add(className);
  return ele
}

class CanvasVideo {
  animationAuthorization = true;
  spentTime = new TimeCapsule(0);

  constructor(id) {
    this.id = id;
    this.canvas = dc.id(id);
    this.canvasClone = this.canvas.cloneNode();

    this.video = document.createElement('video');
    this.video.style.display = "none";
    this.video.addEventListener('ended', ()=>{this.finished()});
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
    this.container.classList.add('hover');

    let hoverTimeout;
    this.container.onmousemove = () => {
      if (!this.playButton.classList.contains('active')) return
      clearInterval(hoverTimeout);
      this.container.classList.add('hover');

      hoverTimeout = setTimeout(() => {
        if (!this.playButton.classList.contains('active')) return
        this.container.classList.remove('hover');
      }, 2500);
    }
    this.container.onmouseout = () => {
      if (!this.playButton.classList.contains('active')) return
      this.container.classList.remove('hover');
    }
    this.container.ondblclick = e => {
      if (this.controlBar.contains(e.target)) return;
      this.toggleFullscreen();
    }
    this.container.onclick = e => {
      if (this.controlBar.contains(e.target)) return;
      this.toggleVideoPlay();
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
    }
    this.controlBar.appendChild(this.progressBar);

    //create buttons
    this.fullscButton = this.#createButton('', this.toggleFullscreen, { className: "fullsc", altIcon: '' });
    this.settingButton = this.#createButton('', null, { className: "setting" });
    this.volumeButton = this.#createButton('', null, { altIcon: '', className: 'volume' });
    this.#createButton('', () => {
      this.#showNotif({icon: ""});
      this.jumpVideo({ amount: 15 });
    });
    this.#createButton('', () => {
      this.#showNotif({icon: ""});
      this.jumpVideo({ amount: -15 })
    });
    this.playButton = this.#createButton('', ()=>{this.toggleVideoPlay()}, { altIcon: '' });

    //volume 
    this.volumeBar = createEle('volumeBar')
    this.volumeBar.onclick = e => {
      let progress = (e.layerX / this.volumeBar.clientWidth) * 100;
      console.log(progress);
      this.changeVolume(progress)
      this.volumeBar.style.setProperty('--progress', progress);
    }
    this.volumeButton.appendChild(this.volumeBar);
    this.volumeButton.onclick = e => {
      if (this.volumeBar.contains(e.target)) return
      this.toggleMute();
    }

    //notif part
    this.notif = createEle('notif');
    this.container.appendChild(this.notif);

    //setting menu
    this.settingMenu = document.createElement('div');
    let speeds = [.5, .75, 1, 1.25, 1.5, 1.75, 2];
    speeds.forEach(i=>{
      let li = document.createElement('li');
      li.innerText = i;
      li.onclick = () => {
        this.changeSpeed(i);
        this.#showNotif({text: i})
      }
      this.settingMenu.appendChild(li);
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

    button.onclick = () => { onclick(button) };

    this.controlBar.appendChild(button);
    return button
  }

  //control methods
  #showNotif({icon, text} = {}) {
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
    let isVideoPlaying = this.playButton.classList.toggle('active');
    if (!isVideoPlaying) {
      this.#showNotif({icon: this.playButton.dataset.altIcon})
      this.video.pause();
      this.animationAuthorization = false;
    } else {
      this.#showNotif({icon: this.playButton.dataset.icon})
      this.video.play();
      this.animationAuthorization = true;
      this.#paintCanvas();
    }
  }
  finished() {
    this.toggleVideoPlay();
    this.container.classList.add('hover')
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
  }
  toggleMute = () => {
    this.volumeButton.classList.toggle('active')
    this.video.muted = !this.video.muted;
  }
  changeSpeed(amount) {
    this.video.playbackRate = amount;
  }
}

dc.queries('canvas.video').forEach(canvas => {
  new CanvasVideo(canvas.id);
})
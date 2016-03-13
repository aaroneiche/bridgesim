///<reference path="../bower_components/polymer-ts/polymer-ts.d.ts" />
///<reference path="../typings/browser.d.ts" />
///<reference path="../core/ship.ts" />
///<reference path="../net/message.ts" />
///<reference path="../net/host.ts" />
///<reference path="../net/webrtc.ts" />
///<reference path="../net/loopback.ts" />
///<reference path="const.ts" />
///<reference path="map.ts" />
///<reference path="nav.ts" />
///<reference path="thrust.ts" />
///<reference path="power.ts" />

namespace Bridgesim.Client {

  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [{urls: 'stun:stun.1.google.com:19302'}]
  };

  @component('bridgesim-game')
  class Game extends polymer.Base {
    @property({type: Number, value: 50}) size: number;

    private isHost: boolean;

    @computed()
    isClient(isHost): boolean {
      return !isHost;
    }

    // WebRTC token signalling
    private pendingConn: Net.WebRTCConnection;
    private copyOffer: string;
    private copyAnswer: string;
    private pasteOffer: string;
    private pasteAnswer: string;

    private host: Net.Host;

    // client -> server
    private conn: Net.Connection;

    private clientId: number;
    private ship: Core.Ship;
    private ships: Core.Ship[];
    private shipId: number;

    private latestSync: Net.Sync;
    private prevTs: number = 0;
    private lag: number = 0;
    private netLag: number = 0;

    private urlQuery: string;

    private animationRequestId: number;

    ready(): void {
      this.ships = [];
      if (this.urlQuery.indexOf('invite') != -1) {
        this.isHost = true;
        this.invitePlayer();
      } else if (this.urlQuery.indexOf('join') != -1) {
        this.joinGame();
      }
    }

    @observe('isHost')
    isHostChanged(isHost): void {
      this.resetSimulation();
      this.resetNetwork();
      if (isHost) {
        const loopback = new Net.Loopback();
        this.conn = loopback.a;
        this.setupConn();
        this.host = new Net.Host();
        this.host.addConnection(loopback.b);
        this.host.start();
        loopback.open();
      }
    }

    resetSimulation() {
      console.log('reset simulation');
      if (this.animationRequestId != null) {
        cancelAnimationFrame(this.animationRequestId);
        this.animationRequestId = null;
      }
      this.ship = null;
      this.ships = [];
      this.shipId = null;
      this.latestSync = null;
      this.prevTs = 0;
      this.lag = 0;
      this.netLag = 0;
    }

    resetNetwork() {
      console.log('reset network');
      if (this.conn) {
        this.conn.close();
        this.conn = null;
      }
      if (this.host) {
        this.host.stop();
        this.host = null;
      }
      this.clientId = null;
    }

    setupConn() {
      this.conn.onOpen = () => {
        this.conn.send({type: Net.Type.Hello, hello: {name: 'stranger'}}, true);
      };
      this.conn.onMessage = this.onMessage.bind(this);
      this.conn.onClose = () => {
        console.log('disconnected');
        this.resetSimulation();
      }
    }

    joinGame(): void {
      this.$.joinDialog.open();
      this.conn = this.pendingConn = new Net.WebRTCConnection(RTC_CONFIG);
      this.setupConn();
      this.pendingConn.makeOffer().then(
          offer => { this.copyOffer = Net.encodeRSD(offer); });
    }

    invitePlayer(): void { this.$.inviteDialog.open(); }

    @observe('pasteOffer')
    onPasteOffer(offer): void {
      if (!offer) {
        return;
      }
      this.pendingConn = new Net.WebRTCConnection(RTC_CONFIG);
      this.pendingConn.onOpen = () => {
        this.host.addConnection(this.pendingConn);
        this.$.inviteDialog.close();
      };
      this.pendingConn.takeOffer(Net.decodeRSD(offer))
          .then(answer => { this.copyAnswer = Net.encodeRSD(answer); });
    }

    @observe('pasteAnswer')
    onPasteAnswer(answer): void {
      if (!answer) {
        return;
      }
      this.pendingConn.takeAnswer(Net.decodeRSD(answer));
    }

    clearTokens(): void {
      this.pendingConn = null;
      this.copyOffer = '';
      this.copyAnswer = '';
      this.pasteOffer = '';
      this.pasteAnswer = '';
    }

    selectAndCopy(event: Event): void {
      (<HTMLTextAreaElement>event.target).select();
      document.execCommand('copy');
    }

    onMessage(msg: Net.Message) {
      if (msg.type == Net.Type.Welcome) {
        console.log('welcome', msg.welcome);
        this.clientId = msg.welcome.clientId;
        this.shipId = msg.welcome.shipId;
        this.applyUpdates(msg.welcome.updates);
        this.ship = this.ships[this.shipId];
        this.frame(0);
        this.$.joinDialog.close();

      } else if (msg.type == Net.Type.ReceiveChat) {
        this.$.lobby.receiveMsg(msg.receiveChat);

      } else if (msg.type == Net.Type.Sync) {
        this.latestSync = msg.sync;
      }
    }

    sendChat(event): void {
      this.conn.send(
          {type: Net.Type.SendChat, sendChat: {text: event.detail.text}}, true);
    }

    applyUpdates(updates: Net.Update[]): void {
      updates.forEach(u => {
        let ship = this.ships[u.shipId];
        if (!ship) {
          ship = new Core.Ship(u.shipId.toString(), u.x, u.y, u.heading);
          ship.thrust = u.thrust;
          this.ships[u.shipId] = ship;
        } else if (u.shipId != this.shipId) {
          ship.x = u.x;
          ship.y = u.y;
          ship.heading = u.heading;
          ship.thrust = u.thrust;
        }
      });
    }

    frame(ts: number): void {
      this.animationRequestId = requestAnimationFrame(this.frame.bind(this));

      if (this.latestSync) {
        this.applyUpdates(this.latestSync.updates);
        this.latestSync = null;
      }

      this.$.input.process();

      const elapsed = ts - this.prevTs;
      this.lag += elapsed;
      this.netLag += elapsed;

      while (this.lag >= SIM_TICK) {
        for (var i = 0; i < this.ships.length; i++) {
          this.ships[i].tick();
        }
        this.lag -= SIM_TICK;
      }

      this.$.map.draw();
      this.$.nav.draw();
      this.$.thrust.draw();
      this.$.power.draw();

      if (this.netLag >= NET_TICK) {
        const update: Net.Update = {
          x: this.ship.x,
          y: this.ship.y,
          heading: this.ship.heading,
          thrust: this.ship.thrust
        };
        this.conn.send({type: Net.Type.Update, update: update}, false);
        this.netLag = 0;
      }

      this.prevTs = ts;
    }
  }
  Game.register();
}

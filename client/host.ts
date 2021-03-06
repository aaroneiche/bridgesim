///<reference path="../bower_components/polymer-ts/polymer-ts.d.ts" />


import {Host} from '../core/host';
import {Loopback} from '../net/loopback';
import {WebRTCConnection, decodeRSD, encodeRSD} from '../net/webrtc';

import {RTC_CONFIG} from './webrtc-config';

@component('bridgesim-host')
class HostWrapper extends polymer.Base {
  @property({type: String}) serverName: string;
  @property({type: Boolean}) serverHidden: boolean;
  @property({type: String, notify: true}) serverToken: string;

  private host: Host;

  attached(): void {
    console.log('host-wrapper: attached');
    this.host = new Host();
    this.host.start();

    const loopback = new Loopback();
    loopback.open();
    this.host.addConnection(loopback.b);
    this.fire('connection', loopback.a);

    this.$.lobby.offer = (offer: {Offer: string}, resolve: (any) => void) => {
      this.onOffer(offer.Offer).then((answer: string) => {
        resolve({Answer: answer});
      });
    };
  }

  @observe('serverToken')
  serverTokenChanged(token: string) {
    this.host.settings.token = token;
  }

  detached(): void {
    console.log('host-wrapper: detached');
    this.serverToken = '';
    this.host.stop();
  }

  onOffer(offer: string): Promise<string> {
    console.log('host-wrapper: got offer');
    const conn = new WebRTCConnection(RTC_CONFIG);
    conn.onOpen = () => { this.host.addConnection(conn); };
    return conn.takeOffer(decodeRSD(offer)).then(answer => {
      return encodeRSD(answer);
    });
  }
}
HostWrapper.register();

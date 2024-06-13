class PeerService {
  private peer: RTCPeerConnection | null = null;

  public getPeer(): RTCPeerConnection | null {
    return this.peer;
  }

  constructor() {
    if (typeof window !== "undefined" && !this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
        ],
      });
    }
  }

  setLocalDescription = async (
    ans: RTCSessionDescriptionInit
  ): Promise<void> => {
    if (this.peer) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
    }
  };

  getAnswer = async (
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | undefined> => {
    if (this.peer) {
      await this.peer.setRemoteDescription(offer);
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      return ans;
    }
  };

  getOffer = async (): Promise<RTCSessionDescriptionInit | undefined> => {
    if (this.peer) {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      return offer;
    }
  };

  toggleAudio = (): void => {
    if (this.peer) {
      const audioSender = this.peer
        .getSenders()
        .find((sender) => sender.track?.kind === "audio");
      if (audioSender && audioSender.track) {
        audioSender.track.enabled = !audioSender.track.enabled;
      }
    }
  };

  toggleVideo = (): void => {
    if (this.peer) {
      const videoSender = this.peer
        .getSenders()
        .find((sender) => sender.track?.kind === "video");
      if (videoSender && videoSender.track) {
        videoSender.track.enabled = !videoSender.track.enabled;
      }
    }
  };
}

const peerServiceInstance = new PeerService();
export default peerServiceInstance;

import React, { useEffect, useRef, useState } from "react";
import adapter from "webrtc-adapter";
import { Button } from "./ui/button";

interface IceCandidate {
  candidate: string;
  sdpMid: string;
  sdpMLineIndex: number;
  usernameFragment: string;
}

interface SdpAnswerMessage {
  command: string;
  sessionA: string;
  sessionB: string;
  sdpAnswer: string;
  iceCandidates: IceCandidate[];
}

const PaxCallClient: React.FC = () => {
  const [session, setSession] = useState<string>("");
  const [sessionB, setSessionB] = useState<string>("");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  useEffect(() => {
    const initWebSocket = async () => {
      const response = await fetch(
        "https://go.paxintrade.com/paxcall/create_session"
      );
      const data = await response.json();
      const session = data.session;
      setSession(session);

      ws.current = new WebSocket(
        `wss://go.paxintrade.com/paxcall/ws?paxcall_session=${session}`
      );
      ws.current.addEventListener("open", (event) => {
        console.log("WebSocket opened:", event);
      });

      ws.current.onmessage = (message) => {
        let msg;
        try {
          msg = JSON.parse(message.data);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          msg = message.data;
          return;
        }
        handleWebSocketMessage(msg);
      };
    };

    initWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (msg: any) => {
    switch (msg.command) {
      case "coming_call":
        setIncomingCall(msg);
        break;
      case "sdp_answer":
        handleSdpAnswer(msg);
        break;
      case "ice_candidate":
        handleIceCandidate(msg);
        break;
      case "start_video":
        handleStartVideo(msg);
        break;
      default:
        break;
    }
  };

  const handleStartVideo = async (msg: any) => {
    console.log("Handling SDP answer:", msg);

    if (peerConnection) {
      const sdpOffer = msg.sdpOffer;
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription({ sdp: sdpOffer, type: "offer" })
      );

      // Создаем SDP Answer
      const sdpAnswer = await peerConnection.createAnswer();

      // Устанавливаем локальное описание
      await peerConnection.setLocalDescription(sdpAnswer);

      // Отправляем SDP Answer обратно отправителю
      const message = {
        command: "video_answer",
        sessionA: session,
        sessionB: sessionB,
        sdpAnswer: sdpAnswer.sdp,
      };

      // Отправляем ответ через WebSocket
      sendMessage(message);
    }
  };

  const handleIncomingCall = async () => {
    if (!incomingCall) return;
    setSession(incomingCall.sessionA);
    setSessionB(incomingCall.sessionB);

    const pc = createPeerConnection();
    setPeerConnection(pc);

    const offer = new RTCSessionDescription({
      type: "offer",
      sdp: incomingCall.sdpOffer,
    });
    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendMessage({
      command: "sdpAnswer",
      sessionA: incomingCall.sessionA,
      sessionB: incomingCall.sessionB,
      sdpAnswer: answer.sdp,
    });

    setIncomingCall(null); // Reset incoming call state
  };

  const handleSdpAnswer = async (msg: SdpAnswerMessage) => {
    console.log("Handling SDP answer:", msg);

    if (peerConnection) {
      var stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const answer = new RTCSessionDescription({
        type: "answer",
        sdp: msg.sdpAnswer,
      });
      await peerConnection.setRemoteDescription(answer);

      msg.iceCandidates.forEach((candidate) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      });
    }
  };

  const handleIceCandidate = (msg: any) => {
    console.log("Handling ICE candidate:", msg);
    if (peerConnection) {
      const candidate = new RTCIceCandidate(msg);
      peerConnection.addIceCandidate(candidate);
    }
  };

  const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      console.log("Create candidate:", event);
      if (event.candidate) {
        sendMessage({
          command: "ice_candidate",
          sessionA: session,
          sessionB: sessionB,
          iceCandidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote", event.streams);
      if (remoteVideoRef.current) {
        setRemoteStream(event.streams[0]);

        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    if (localVideoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          console.log("Got local stream:", stream);
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            remoteVideoRef.current.srcObject = stream;
          }
        })
        .catch((error) => {
          console.error("Error accessing media devices.", error);
        });
    }

    return pc;
  };

  const sendMessage = (msg: any) => {
    if (ws.current) {
      ws.current.send(JSON.stringify(msg));
    }
  };

  const startCall = async () => {
    const pc = createPeerConnection();
    setPeerConnection(pc);

    var stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendMessage({
      command: "call",
      sessionA: session,
      sessionB: sessionB,
      sdpOffer: offer.sdp,
    });
  };

  const startVideoTransmission = async () => {
    try {
      if (peerConnection) {
        // Получаем медиа-устройства с видео
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });

        // Получаем все локальные медиа-потоки
        // const senders = peerConnection.getSenders();

        // Заменяем старый медиа-поток на новый с видео
        videoStream.getTracks().forEach((newTrack) => {
          // const matchingSender = senders.find(sender => sender.track && sender.track.kind === newTrack.kind);

          // if (matchingSender) {
          //     matchingSender.replaceTrack(newTrack);
          // } else {
          //     peerConnection.addTrack(newTrack, videoStream);
          // }
          peerConnection.addTrack(newTrack, videoStream);
        });

        // Создаем предложение для обновленных параметров медиа-потока
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        const message = {
          command: "video_started",
          sessionA: session,
          sessionB: sessionB,
          sdpOffer: offer.sdp, // sdp SDP Offer
        };
        // Convert the message to JSON and send it over the WebSocket
        sendMessage(message);
      }
    } catch (error) {
      console.error("Error enabling video");
    }
  };

  const endCall = () => {
    const message = {
      command: "finish",
      sessionA: session,
      sessionB: sessionB,
    };
    sendMessage(JSON.stringify(message));
  };

  return (
    <div>
      <h1>PaxCall Client</h1>
      <p>{session}</p>
      <input
        type="text"
        placeholder="session B"
        value={sessionB}
        onChange={(e) => setSessionB(e.target.value)}
      />
      <Button onClick={startCall} disabled={isVideoEnabled}>
        Start Call
      </Button>
      <Button onClick={startVideoTransmission}>Enable Video</Button>
      <Button onClick={endCall}>End Call</Button>

      {incomingCall && (
        <div>
          <p>Incoming call from session: {incomingCall.sessionA}</p>
          <Button onClick={handleIncomingCall}>Accept Call</Button>
        </div>
      )}
      <video ref={localVideoRef} autoPlay muted />
      <video ref={remoteVideoRef} autoPlay />
    </div>
  );
};

export default PaxCallClient;

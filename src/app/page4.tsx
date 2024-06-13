"use client";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

const Home = () => {
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  // const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false);
  const [sessionA, setSessionA] = useState("");
  const [sessionB, setSessionB] = useState("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const pickupAudioRef = useRef<HTMLAudioElement>(null);
  const comingAudioCallRef = useRef<HTMLAudioElement>(null);
  const callAudioRef = useRef<HTMLAudioElement>(null);
  const endcallAudioRef = useRef<HTMLAudioElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const modal2Ref = useRef<HTMLDivElement>(null);
  const [paxcallSession, setPaxcallSession] = useState<string | null>(null);
  let ice_candidate = [];
  let isMicrophoneMuted = false;

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    sdpSemantics: "unified-plan",
    codecs: [
      { name: "opus", mimeType: "audio/opus" },
      { name: "vp8", mimeType: "video/vp8" },
    ],
  };

  const peerConnection = new RTCPeerConnection(configuration);

  peerConnection.addEventListener("iceconnectionstatechange", () => {
    console.log("ICE Connection State:", peerConnection.iceConnectionState);

    if (peerConnection.iceConnectionState === "connected") {
      if (audioElementRef.current)
        audioElementRef.current.srcObject = remoteStream;

      audioElementRef.current?.play();

      const enableVideoButton = document.querySelector(
        'button[onclick="enableVideo()"]'
      );
      if (enableVideoButton) enableVideoButton.removeAttribute("disabled");

      const disableAudito = document.querySelector(
        'button[onclick="muteMicro()"]'
      );
      if (disableAudito) disableAudito.removeAttribute("disabled");

      pickupAudioRef.current?.play();

      console.log("RTCPeerConnection connected to the STUN server.");
    }
  });

  peerConnection.addEventListener("track", (event) => {
    setRemoteStream(event.streams[0]);
  });
  function enableVideo() {
    if (!isVideoEnabled) {
      startVideoTransmission();
    } else {
      stopVideoTransmission();
    }
  }
  const handleMessage = async (event: MessageEvent) => {
    if (event.data.length < 25) {
      console.log("WebSocket message received:", event.data);
      const divElement = document.getElementById("session");
      if (divElement) {
        divElement.textContent = event.data;
      }
    }

    let data = JSON.parse(event.data);

    if (data.command === "stoped_video") {
      document.getElementById("remoteVideo").style.display = "none";
    }

    if (data.command === "start_video") {
      const sdpOffer = data.sdpOffer;
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
        sessionA: sessionA,
        sessionB: sessionB,
        sdpAnswer: sdpAnswer.sdp,
      };

      // Отправляем ответ через WebSocket
      socketRef.current?.send(JSON.stringify(message));
      document.getElementById("remoteVideo").style.display = "block";
    }

    if (event.data.length > 30) {
      let data = JSON.parse(event.data);
      let sdpOffer = null;

      if (data.candidate) {
        ice_candidate.push(data);
      }

      if (data.command === "coming_call") {
        comingAudioCallRef.current?.play();

        sdpOffer = data.sdpOffer;
        setSessionA(data.sessionA);

        document.getElementById("sessionBInput").value = data.sessionA;
        document.getElementById("sessionAInput").value = data.sessionB;

        openModal2();

        peerConnection.setRemoteDescription(
          new RTCSessionDescription({ sdp: sdpOffer, type: "offer" })
        );
      }

      if (data.command === "sdp_answer") {
        callAudioRef.current?.pause();

        let sdpAnswer = data.sdpAnswer;
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription({ sdp: sdpAnswer, type: "answer" })
        );

        if (data.iceCandidates) {
          let candidates = data.iceCandidates;

          candidates.forEach(async (candidate: any) => {
            const iceCandidate = new RTCIceCandidate(candidate);
            await peerConnection.addIceCandidate(iceCandidate);
          });

          const medStrm = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          setMediaStream(medStrm);
          mediaStream?.getTracks().forEach((track) => {
            peerConnection.addTrack(track, mediaStream);
          });

          closeModals();
        }
      }

      if (data.command === "finish") {
        if (audioElementRef.current) {
          audioElementRef.current?.pause();
          audioElementRef.current.srcObject = null;
        }

        callAudioRef.current?.pause();
        comingAudioCallRef.current?.pause();

        endcallAudioRef.current?.play();

        peerConnection.close();

        stopStream();
        // Uncomment after button video ON
        // videoElement.srcObject = stream;

        // Open a modal window
        closeModals();
      }
    }
  };

  function addVideoTrackToPeerConnection(videoTrack: MediaStreamTrack) {
    const existingVideoSender = peerConnection
      .getSenders()
      .find((sender) => sender.track && sender.track.kind === "video");
    if (existingVideoSender) {
      // Если видео было остановлено, возобновляем его
      if (videoTrack.readyState === "ended") {
        console.log("Video track was ended. Resuming...");
        videoTrack.enabled = true;
      }

      // Заменяем поток в существующем RTCPeerConnection
      existingVideoSender.replaceTrack(videoTrack);
    } else {
      // Добавляем новый видеотрек
      peerConnection.addTrack(videoTrack);
    }
  }

  peerConnection.ontrack = function (event) {
    console.log("Новый видеотрек обнаружен:", event);
    const remoteVideo = document.getElementById("remoteVideo");
    // Добавляем видеопоток к элементу video на странице
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  };

  const startVideoTransmission = async () => {
    try {
      // Получаем медиа-устройства с видео
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });

      const sessionAValue = (
        document.getElementById("sessionAInput") as HTMLInputElement
      ).value;
      const sessionBValue = (
        document.getElementById("sessionBInput") as HTMLInputElement
      ).value;

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

      // Check if the sessionB input is not empty before sending
      if (sessionAValue.trim() !== "" && sessionBValue.trim() !== "") {
        const message = {
          command: "video_started",
          sessionA: sessionAValue,
          sessionB: sessionBValue,
          sdpOffer: offer.sdp, // sdp SDP Offer
        };
        // Convert the message to JSON and send it over the WebSocket
        socketRef.current?.send(JSON.stringify(message));

        setIsVideoEnabled(true);
        const enableVid = document.querySelector(
          'button[onclick="enableVideo()"]'
        );
        if (enableVid) enableVid.innerText = "Disable Video";
        console.error(
          "Session A or Session B value is empty. Please enter values."
        );
      }
    } catch (error) {
      console.error("Error enabling video");
    }
  };

  function updatePeerConnectionWithStream(
    peerConnection: RTCPeerConnection,
    newStream: MediaStream
  ) {
    // Получаем sender для аудиотрека
    const audioSender = peerConnection
      .getSenders()
      .find((sender) => sender.track && sender.track.kind === "audio");
    const videoSender = peerConnection
      .getSenders()
      .find((sender) => sender.track && sender.track.kind === "video");

    // Заменяем аудиотрек в sender'е
    if (audioSender) {
      audioSender.replaceTrack(newStream.getAudioTracks()[0]);
    }

    // Если есть видеотрек, заменяем его в sender'е
    if (videoSender) {
      if (newStream.getVideoTracks().length > 0) {
        videoSender.replaceTrack(newStream.getVideoTracks()[0]);
      } else {
        // Если видео выключено, удаляем видеотрек из sender'а
        peerConnection.removeTrack(videoSender);
      }
    }
  }

  function stopVideoTransmission() {
    // Stop the video tracks
    peerConnection.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === "video") {
        sender.track.stop();
      }
    });

    // Update the flag and button text
    setIsVideoEnabled(false);
    document.querySelector('button[onclick="enableVideo()"]').innerText =
      "Enable Video";

    const sessionAValue = (
      document.getElementById("sessionAInput") as HTMLInputElement
    ).value;
    const sessionBValue = (
      document.getElementById("sessionBInput") as HTMLInputElement
    ).value;

    const message = {
      command: "video_stoped",
      sessionA: sessionAValue,
      sessionB: sessionBValue,
    };

    // Отправляем ответ через WebSocket
    socketRef.current?.send(JSON.stringify(message));
  }

  function muteMicro() {
    const buttonText = document.querySelector('button[onclick="muteMicro()"]');

    if (stream) {
      if (isMicrophoneMuted === false) {
        buttonText.innerText = "Disabled Mic";
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        isMicrophoneMuted = true;
      } else {
        buttonText.innerText = "Enabled Mic";
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        isMicrophoneMuted = false;
      }
    } else {
      console.error("Stream not available.");
    }
  }

  const callWebSocket = async () => {
    callAudioRef.current?.play();

    const sessionAValue = (
      document.getElementById("sessionAInput") as HTMLInputElement
    ).value;
    const sessionBValue = (
      document.getElementById("sessionBInput") as HTMLInputElement
    ).value;

    const strm = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(strm);
    stream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
    openModal();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Check if the sessionB input is not empty before sending
    if (sessionAValue.trim() !== "" && sessionBValue.trim() !== "") {
      const message = {
        command: "call",
        sessionA: sessionAValue,
        sessionB: sessionBValue,
        sdpOffer: offer.sdp, // sdp SDP Offer
      };
      setSessionB(sessionBValue);
      // Convert the message to JSON and send it over the WebSocket
      socketRef.current?.send(JSON.stringify(message));
    } else {
      console.error(
        "Session A or Session B value is empty. Please enter values."
      );
    }

    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        // console.log('ICE Candidate:', event.candidate);

        const iceCandidateMessage = {
          command: "ice_candidate",
          sessionA: sessionA,
          sessionB: sessionB,
          iceCandidate: event.candidate,
        };

        socketRef.current?.send(JSON.stringify(iceCandidateMessage));
      }
    });
  };

  const makeAnswer = async () => {
    ice_candidate.forEach(async (candidate, index) => {
      const iceCandidate = new RTCIceCandidate(candidate);
      await peerConnection.addIceCandidate(iceCandidate);
    });

    comingAudioCallRef.current?.pause();

    try {
      const strm = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(strm);
      stream?.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
      // make SDP Answer
      const sdpAnswer = await peerConnection.createAnswer();

      // local set
      await peerConnection.setLocalDescription(sdpAnswer);

      let iceCandidates = [];

      peerConnection.addEventListener("icecandidate", (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate);
        } else {
          let answerMessage = {
            command: "sdpAnswer",
            sessionA: sessionA,
            sdpAnswer: sdpAnswer.sdp,
            iceCandidates: iceCandidates,
          };

          socketRef.current?.send(JSON.stringify(answerMessage));
        }
      });
    } catch (error) {
      console.error("Error creating and sending SDP Answer:", error);
    }
    closeModals();
  };

  function endCall() {
    const sessionAValue = (
      document.getElementById("sessionAInput") as HTMLInputElement
    ).value;
    const sessionBValue = (
      document.getElementById("sessionBInput") as HTMLInputElement
    ).value;

    if (modal2Ref.current) modal2Ref.current.style.display = "none";
    const message = {
      command: "finish",
      sessionA: sessionAValue,
      sessionB: sessionBValue,
    };
    socketRef.current?.send(JSON.stringify(message));
  }

  function openModal() {
    if (modalRef.current) modalRef.current.style.display = "block";
  }
  function openModal2() {
    if (modal2Ref.current) modal2Ref.current.style.display = "block";
  }

  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      const iceCandidateMessage = {
        command: "ice_candidate",
        sessionA: sessionA,
        sessionB: sessionB,
        iceCandidate: event.candidate,
      };

      console.log(event.candidate);

      socketRef.current?.send(JSON.stringify(iceCandidateMessage));
    }
  });

  function stopStream() {
    if (mediaStream) {
      const tracks = mediaStream.getTracks();
      tracks.forEach((track) => track.stop());
      setMediaStream(null);
    }
  }

  function closeModals() {
    if (modalRef.current) modalRef.current.style.display = "none";
    if (modal2Ref.current) modal2Ref.current.style.display = "none";
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "http://localhost:2000/create_session",
          {
            withCredentials: true,
          }
        );

        const cookieHeader = response.headers["set-cookie"];
        if (cookieHeader) {
          const cookieValue = cookieHeader[0].split(";")[0];
          const [, value] = cookieValue.split("=");
          setPaxcallSession(value);
        }
        setPaxcallSession(response.data.session);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (paxcallSession != null) {
      const wsUrl = `ws://localhost:2000/ws?paxcall_session=${paxcallSession}`;
      socketRef.current = new WebSocket(wsUrl);

      console.log(paxcallSession);

      socketRef.current.addEventListener("open", (event) => {
        console.log("WebSocket opened:", event);
      });

      socketRef.current.addEventListener("message", handleMessage);
      // socketRef.current.addEventListener("message", (handleMessage) => {});

      socketRef.current.addEventListener("close", (event) => {
        console.log("WebSocket closed:", event);
      });

      socketRef.current.addEventListener("error", (event) => {
        console.error("WebSocket error:", event);
      });

      return () => {
        if (
          socketRef.current &&
          socketRef.current.readyState === WebSocket.OPEN
        ) {
          socketRef.current.close();
        }
      };
    }
  }, [paxcallSession]);

  return (
    <div>
      <audio id="pickup" ref={pickupAudioRef}>
        <source src="/audio/message-received.mp3" type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
      <audio id="comingAudioCall" ref={comingAudioCallRef} loop>
        <source src="/audio/notification.mp3" type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
      <audio id="callAudio" ref={callAudioRef} loop>
        <source src="/audio/call.mp3" type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
      <audio id="endcall" ref={endcallAudioRef}>
        <source src="/audio/end.mp3" type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
      <audio id="audioElement" ref={audioElementRef} autoPlay></audio>
      <video
        style={{ display: "none" }}
        id="remoteVideo"
        ref={remoteVideoRef}
        width="320"
        height="240"
        autoPlay
        muted
        playsInline
      ></video>

      <div id="session">{paxcallSession}</div>
      <input id="sessionAInput" placeholder="session A" />
      <input id="sessionBInput" placeholder="session B" />
      <button onClick={callWebSocket}>Call</button>
      <button onClick={enableVideo} disabled={!isVideoEnabled}>
        {isVideoEnabled ? "Disable video" : "Enable video"}
      </button>
      <button onClick={muteMicro} disabled={!mediaStream}>
        {isMicrophoneMuted ? "Unmute mic" : "Mute mic"}
      </button>

      <div id="myModal" className="modal" ref={modalRef}>
        <div className="modal-content">
          <video id="videoElement" autoPlay playsInline></video>
          <div className="flex">
            <button onClick={endCall}>End call</button>
          </div>
        </div>
      </div>
      <div id="myModal2" className="modal" ref={modal2Ref}>
        <div className="modal-content">
          <video id="videoElement2" autoPlay playsInline></video>
          <div className="flex">
            <button onClick={makeAnswer}>Accept call</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

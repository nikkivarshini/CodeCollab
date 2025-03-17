import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../services/Peer.js";
import { useSocket } from "../utils/SocketProvider.js.js";
import Editor from "./EditorPage.js";
import { useParams } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import Dialog from "./DialogBox.jsx";
import { useNavigate } from "react-router-dom";
import {Camera,Mic,MicOff,Monitor,Phone,VideoOff,Code,Maximize2,Minimize2,X,MessageSquare,MessageCircle} from "lucide-react";
import axios from "axios";

const RoomPage = () => {
  const socket = useSocket();
  const [incomingCall, setIncomingCall] = useState(false);
  const { roomId, email } = useParams();
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [remoteEmail, setRemoteEmail] = useState(null);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState(null);
  const [codeRef, setCodeRef] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  //const [isCompiling, setIsCompiling] = useState(false);  
  const navigate = useNavigate();
  // only for ui realted components
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatbotMessage, setChatbotMessage] = useState('');
  const [chatbotMessages, setChatbotMessages] = useState([]);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

   // Handle sending message
    const sendMessage = () => {
      if (message.trim() !== '') {
        socket.emit("send_message", { roomId, email, message });
        setMessage(''); 
      }
    };

    useEffect(() => {
      const messageContainer = document.querySelector('.chatbox-messages');
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    }, [messages]);


    useEffect(() => {
      socket.on('chat_response', ({ message }) => {
        setChatbotMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'Chatbot', message },
        ]);
        setIsLoading(false); 
      });
    
      return () => {
        socket.off('chat_response');
      };
    }, [socket]);
  
    // Listen for incoming messages
    useEffect(() => {
      socket.on("receive_message", (msg) => {
        setMessages((prevMessages) => [...prevMessages, msg]);
      });
      // Cleanup on component unmount
      return () => {
        socket.off("receive_message");
      };
    }, [socket]);
    
    useEffect(() => {
      const handleUnload = () => {
        // This ensures the devices are released on page refresh or navigation away
        if (myStream) {
          myStream.getTracks().forEach((track) => track.stop());
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach((track) => track.stop());
        }
      };
    
      window.addEventListener('beforeunload', handleUnload);
      return () => {
        window.removeEventListener('beforeunload', handleUnload);
      };
    }, [myStream, remoteStream]);
    
  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`, id);
    socket.emit("sync:code", { id, codeRef });
    setRemoteSocketId(id);
    setRemoteEmail(email);
    setShowDialog(true);
    socket.emit("wait:for:call", { to: id, email });
    return () => {
      socket.off("wait:for:call");
    };
  }, [codeRef,socket]);

  useEffect(() => {
  }, [chatbotMessages]);

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // const handleToggleChatbot = () => {
  //   setIsChatbotOpen(!isChatbotOpen); // Toggle chatbot state
  // };

// Function to send a message to the chatbot
const sendChatbotMessage = async () => {
  if (!chatbotMessage.trim()) return;

  // Add user's message to the chat UI
  setChatbotMessages((prevMessages) => [
    ...prevMessages,
    { sender: "You", message: chatbotMessage },
  ]);

  setIsLoading(true);
  setChatbotMessage("");
  try {
    const response = await axios.post("http://localhost:8000/api/chat", {
      message: chatbotMessage,
    });
    console.log("Chatbot response:", response.data.response);  
    console.log(chatbotMessages); 
   setChatbotMessages((prevMessages) => [
      ...prevMessages,
      { sender: "Chatbot", message: response.data.response || "Sorry, I couldn't process your request." },
    ]);
    
  } catch (error) {
    console.error("Error fetching chatbot response:", error);
    setChatbotMessages((prevMessages) => [
      ...prevMessages,
      { sender: "Chatbot", message: "Sorry, I couldn't process your request." },
    ]);
  } finally {
    setIsLoading(false);
  }
};

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer, email });
    setMyStream(stream);
    setShowDialog(false);
  }, [remoteSocketId, socket,email]);

  const handleIncommingCall = useCallback(
    async ({ from, offer, fromEmail }) => {
      setRemoteSocketId(from);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setIncomingCall(true);
      console.log(true);
      setMyStream(stream);
      setRemoteEmail(fromEmail);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    const handleUserLeft = ({ email }) => {
      toast(`${email} has left the room.`, {
        icon: "👋",
      });
      console.log(`${email} has left the room.`);
      if (remoteSocketId) {
        setRemoteSocketId(null);
        setRemoteEmail(null);
        setRemoteStream(null); 
      }
    };
    socket.on("user:left", handleUserLeft);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("user:left", handleUserLeft);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
    remoteSocketId,
  ]);
  useEffect(() => {
    // Ensure that myStream is initialized when the user joins
    const initializeStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
      } catch (err) {
        console.error("Error getting media stream", err);
      }
    };
  
    initializeStream();
  }, []);
  
  useEffect(() => {
    setTimeout(() => {
      if (incomingCall) {
        sendStreams();
        setIncomingCall(false);
      }
    }, 2000);
  }, [incomingCall, sendStreams]);

 // Handle screen share updates
 useEffect(() => {
  socket.on("update-screen-share-status", ({ email, isSharing }) => {
    if (!email) {
      console.error("Received screen share event with undefined email.");
      return;
    }
    
    console.log(`Screen sharing ${isSharing ? 'started' : 'stopped'} for user: ${email}`);

    if (email === remoteEmail) {
      if (isSharing) {
        console.log("Requesting shared screen stream...");
        peer.peer.getReceivers().forEach(receiver => {
          if (receiver.track.kind === "video") {
            setRemoteStream(new MediaStream([receiver.track]));
          }
        });
      } else {
        setRemoteStream(null);
      }
    }
  });

  return () => {
    socket.off("update-screen-share-status");
  };
}, [socket, remoteEmail]);
  
  const toggleVideo = async () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
  
      if (!isVideoOff) {
        videoTrack.stop(); 
        myStream.removeTrack(videoTrack); 
      } else {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          const newVideoTrack = newStream.getVideoTracks()[0];
          const sender = peer.peer.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(newVideoTrack);
          setMyStream(newStream); 
        } catch (error) {
          console.error("Error restarting video:", error);
        }
      }
      socket.emit("user:video:toggle", {
        to: remoteSocketId,
        isVideoOff: !isVideoOff,
        email: email,
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  // Listen for video state changes
  useEffect(() => {
    socket.on("remote:video:toggle", ({ isVideoOff, email }) => {
      if (remoteEmail === email) {
        setRemoteVideoOff(isVideoOff);
        setRemoteStream((prevStream) => {
          const videoTrack = prevStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = !isVideoOff; 
          }
          return prevStream; 
        });
      }
    });
    socket.on("wait:for:call", ({ from, email }) => {
      toast("wait untill someone let u in");
    });
    return () => {
      socket.off("remote:video:toggle");
      socket.off("wait:for:call");
    };
  }, [socket, remoteEmail]);
  

  const handleLeaveRoom = () => { 
    socket.emit("leave:room", { roomId, email });
  
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
      setMyStream(null); 
    }
  
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null); 
    }
  
    // Release video input devices by stopping them
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        devices.forEach(device => {
          if (device.kind === 'videoinput') {
            navigator.mediaDevices.getUserMedia({ video: { deviceId: device.deviceId } })
              .then(stream => {
                stream.getTracks().forEach(track => track.stop());
              });
          }
        });
      })
      .catch(error => {
        console.error("Error releasing video devices:", error);
      });
    setRemoteSocketId(null);
    setRemoteEmail(null);
    navigate("/"); 
    console.log("You left the room. Redirecting to lobby...");
    window.removeEventListener("beforeunload", handleLeaveRoom);
  };
  
  //share screen
  const showScreen = async (email) => {
    console.log("showScreen called, isScreenSharing:", isScreenSharing);

    if (isScreenSharing) {
        // Stop screen sharing
        const screenTrack = myStream.getVideoTracks().find(track => track.label.includes('screen'));
        if (screenTrack) {
            console.log("Stopping screen track");
            screenTrack.stop();
            socket.emit("update-screen-share-status", { email, isSharing: false });
            setIsScreenSharing(false);
            console.log("Screen sharing stopped");

            // Attempt to switch back to camera or audio
            try {
                console.log("Attempting to get user media (camera/audio)");
                const originalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setMyStream(originalStream);

                let sender = peer.peer.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    console.log("Video sender found, replacing track");
                    sender.replaceTrack(originalStream.getVideoTracks()[0]);
                } else {
                    console.log("No video sender found, adding track");
                    peer.peer.addTrack(originalStream.getVideoTracks()[0], myStream);
                }

                console.log("User media stream set");
            } catch (error) {
                console.error("Error getting user media:", error);
                // Fallback to audio-only if camera fails
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    setMyStream(audioStream);
                    let sender = peer.peer.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender){
                        peer.peer.removeTrack(sender.track);
                    }
                    console.log("Audio only stream set");
                } catch (audioError) {
                    console.error("Audio only media failed:", audioError);
                }
            }
        }
        return;
    }

    // Start screen sharing
    try {
        console.log("Attempting to get display media");
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        setMyStream(screenStream);

        let sender = peer.peer.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
            console.log("Video sender found, replacing track");
            sender.replaceTrack(screenStream.getVideoTracks()[0]);
        } else {
            console.log("No video sender found, adding track");
            peer.peer.addTrack(screenStream.getVideoTracks()[0], myStream);
        }

        socket.emit("update-screen-share-status", { email, isSharing: true });
        setIsScreenSharing(true);
        console.log("Screen sharing started");

        screenStream.getVideoTracks()[0].onended = async () => {
            console.log("Screen sharing ended by user");
            socket.emit("update-screen-share-status", { email, isSharing: false });
            setIsScreenSharing(false);

            // Attempt to switch back to camera or audio
            try {
                console.log("Attempting to get user media (camera/audio)");
                const originalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setMyStream(originalStream);

                let sender = peer.peer.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    console.log("Video sender found, replacing track");
                    sender.replaceTrack(originalStream.getVideoTracks()[0]);
                } else {
                    console.log("No video sender found, adding track");
                    peer.peer.addTrack(originalStream.getVideoTracks()[0], myStream);
                }

                console.log("User media stream set");
            } catch (error) {
                console.error("Error getting user media:", error);
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    setMyStream(audioStream);
                    let sender = peer.peer.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender){
                        peer.peer.removeTrack(sender.track);
                    }
                    console.log("Audio only stream set");
                } catch (audioError) {
                    console.error("Audio only media failed:", audioError);
                }
            }
        };

    } catch (error) {
        console.error("Error sharing screen:", error);
        setIsScreenSharing(false);
    }
};

//togglefull screen

const toggleFullscreen = () => {
  if (!isFullscreen) {
    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else if (document.documentElement.mozRequestFullScreen) { // Firefox
      document.documentElement.mozRequestFullScreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
      document.documentElement.webkitRequestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
      document.documentElement.msRequestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    } else if (document.mozCancelFullScreen) { // Firefox
      document.mozCancelFullScreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
      document.webkitExitFullscreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    } else if (document.msExitFullscreen) { // IE/Edge
      document.msExitFullscreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  }

  setIsFullscreen(!isFullscreen); // Toggle the state
};


return (
  <div>
    <Toaster />
    <div className="min-h-screen bg-black/15 flex">
      <div
        className={`flex-1 p-4 transition-all duration-300 ${
          isEditorOpen ? "w-[60%]" : "w-full"
        }`}>
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-8rem)]`}>
          <div className="relative overflow-hidden rounded-lg bg-black/15 shadow-lg">
            <div
              className={`absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-md text-sm`}>
              {email}
            </div>
            {myStream && (
              <>
                {!isVideoOff ? (
                  <ReactPlayer
                    playing
                    muted={isMuted}
                    height="100%"
                    width="100%"
                    url={myStream}
                    className="rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full justify-center flex items-center">
                    <p className="text-[100px]">{email[0].toUpperCase()}</p>
                  </div>
                )}
              </>
            )}
          </div>
          {remoteSocketId && (
            <div className="relative overflow-hidden rounded-lg bg-black/15 shadow-lg">
              <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-md text-sm">
                {remoteEmail}
              </div>

              {remoteStream && (
                <>
                  {!remoteVideoOff ? (
                    <ReactPlayer
                      playing
                      muted={isMuted}
                      height="100%"
                      width="100%"
                      url={remoteStream}
                    />
                  ) : (
                    <div className="w-full h-full justify-center flex items-center">
                      <p className="text-[100px]">
                        {remoteEmail[0].toUpperCase()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/15 backdrop-blur-sm border-t">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-4">
            <button
              className={`p-3 rounded-full border ${
                isMuted
                  ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                  : "hover:bg-gray-100 border-gray-200"
              }`}
              onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              className={`p-3 rounded-full border ${
                isVideoOff
                  ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                  : "hover:bg-gray-100 border-gray-200"
              }`}
              onClick={toggleVideo}>
              {isVideoOff ? <VideoOff size={20} /> : <Camera size={20} />}
            </button>
            <button
                className={`p-3 rounded-full border ${isScreenSharing ? 'bg-blue-500 text-white border-blue-200 hover:bg-blue-600' : 'border-gray-200 hover:bg-gray-100'}`}
                onClick={() => showScreen(email)}
            >
                <Monitor size={20} />
            </button>
            <button
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
              onClick={handleLeaveRoom}>
              <Phone size={20} className="rotate-[135deg]" />
            </button>
            <div className="w-px h-6 bg-gray-200"></div>
            <button
              className="p-3 rounded-full border border-gray-200 hover:bg-gray-100"
              onClick={() => setIsEditorOpen(!isEditorOpen)}>
              <Code size={20} />
            </button>
            <button
              className="p-3 rounded-full border border-gray-200 hover:bg-gray-100"
              onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {/* Chat Icon Button (Updated to match other icons) */}
            <button
              className="p-3 rounded-full border border-gray-200 hover:bg-gray-100"
              onClick={handleToggleChat}>
              <MessageSquare size={24} />
            </button>
            <button
              className="p-3 rounded-full border border-gray-200 hover:bg-gray-100"
              onClick={() => setIsChatbotOpen(!isChatbotOpen)}
            >
              <MessageCircle size={24} />
            </button>
            {/* <button
              className="p-3 rounded-full border border-gray-200 hover:bg-gray-100"
              onClick={handleToggleChatbot}
            >
              <MessageCircle size={24} />
            </button> */}
          </div>
        </div>
      </div>

      {/* Code Editor Panel */}
      {isEditorOpen && (
        <div className="w-[40%] border-l border-gray-200 bg-black/15 relative h-full">
          <div className="p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm flex items-center justify-between">
            <h2 className="font-semibold">Code Editor</h2>
            <button
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={() => setIsEditorOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <div className="bg-white/50 rounded-lg min-h-[calc(90-10rem)] shadow-sm">
              <Editor
                roomId={roomId}
                socket={socket}
                onCodeChange={(code) => {
                  setCodeRef(code);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Chatbox Panel */}
      {isChatOpen && (
        <div className="chatbox-container fixed bottom-16 right-16 z-10 w-96 bg-white shadow-lg rounded-lg">
          <div className="chatbox-header flex justify-between p-3">
            <h3 className="text-sm font-semibold">Chat</h3>
            <button
              className="text-gray-500 hover:text-gray-800"
              onClick={handleToggleChat}>
              Close
            </button>
          </div>
          <div className="chatbox-messages p-3 overflow-y-auto max-h-[300px]">
            {messages.map((msg, index) => (
              <div key={index} className="chatbox-message mb-2">
                <strong>{msg.email}:</strong> {msg.message}
                <small className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </small>
              </div>
            ))}
          </div>
          <div className="chatbox-footer p-3 border-t">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full p-2 border rounded-lg"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="w-full mt-2 bg-blue-500 text-white py-2 rounded-lg disabled:bg-gray-300">
              Send
            </button>
          </div>
        </div>
      )}

      {/*  Chatbot UI */}
      {isChatbotOpen && (
      <div className="chatbot-container fixed bottom-16 right-16 z-10 w-96 bg-white shadow-lg rounded-lg">
        <div className="chatbot-header flex justify-between p-3">
          <h3 className="text-sm font-semibold">Chatbot</h3>
          <button
            className="text-gray-500 hover:text-gray-800"
            onClick={() => setIsChatbotOpen(false)}
          >
            Close
          </button>
        </div>
        <div className="chatbot-messages p-3 overflow-y-auto max-h-[300px]">
          {chatbotMessages.map((msg, index) => (
            <div key={index} className="chatbot-message mb-2">
              <strong>{msg.sender}:</strong> {msg.message}
            </div>
          ))}
        </div>
        <div className="chatbot-footer p-3 border-t">
          <input
            type="text"
            value={chatbotMessage}
            onChange={(e) => setChatbotMessage(e.target.value)}
            placeholder="Ask me anything..."
            className="w-full p-2 border rounded-lg"
          />
          <button
            onClick={sendChatbotMessage}
            disabled={isLoading || !chatbotMessage.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg mt-2 w-full"
          >
            {isLoading ? "Typing..." : "Send"}
          </button>
        </div>
      </div>
      )}
      {/* Dialog for incoming call */}
      {showDialog && remoteEmail && (
        <Dialog
          user={remoteEmail}
          onAdmit={handleCallUser}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  </div>
);
};
export default RoomPage;

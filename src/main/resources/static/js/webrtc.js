const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;
const configuration = {
    'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'}
    ]
};

const socket = new WebSocket('ws://'+location.host+'/signaling');

socket.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'offer') {
        handleOffer(data.offer);
    } else if (data.type === 'answer') {
        handleAnswer(data.answer);
    } else if (data.type === 'candidate') {
        handleCandidate(data.candidate);
    }
};

navigator.mediaDevices.getUserMedia({video: true, audio: true})
    .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;
    })
    .catch(error => console.error('Error accessing media devices.', error));

const startCall = () => {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.send(JSON.stringify({'type': 'candidate', 'candidate': event.candidate}));
        }
    };

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.createOffer()
        .then(offer => {
            peerConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({'type': 'offer', 'offer': offer}));
        });
};

const handleOffer = (offer) => {
    peerConnection.setRemoteDescription(offer);
    peerConnection.createAnswer()
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({'type': 'answer', 'answer': answer}));
        });
};

const handleAnswer = (answer) => {
    peerConnection.setRemoteDescription(answer);
};

const handleCandidate = (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

// Call startCall() when ready to initiate the call, e.g., via a button click
document.getElementById('startCallButton').addEventListener('click', startCall);


document.addEventListener("DOMContentLoaded", function() {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const startCallButton = document.getElementById('startCallButton');

    let localStream;
    let peerConnection;
    const configuration = {
        'iceServers': [
            {'urls': 'stun:stun.l.google.com:19302'}
        ]
    };

    // Ensure you use wss:// for secure WebSocket
    const socket = new WebSocket('wss://'+location.host+':8080/signaling');

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

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            console.log('Got Media Stream:', stream);
            localVideo.srcObject = stream;
            localStream = stream;
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
            alert('Could not access camera. Please check your browser settings and permissions.');
        });

    const startCall = () => {
        peerConnection = new RTCPeerConnection(configuration);

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.send(JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }));
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
                socket.send(JSON.stringify({ 'type': 'offer', 'offer': offer }));
            });
    };

    const handleOffer = (offer) => {
        peerConnection.setRemoteDescription(offer);
        peerConnection.createAnswer()
            .then(answer => {
                peerConnection.setLocalDescription(answer);
                socket.send(JSON.stringify({ 'type': 'answer', 'answer': answer }));
            });
    };

    const handleAnswer = (answer) => {
        peerConnection.setRemoteDescription(answer);
    };

    const handleCandidate = (candidate) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    startCallButton.addEventListener('click', startCall);
});

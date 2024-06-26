const logger = require('./logger.service')

var gIo = null
const USER_LOGIN = 'user-login'
const CLIENT_EMIT_MSG = 'send-msg'
const CLIENT_EMIT_CHAT = 'send-chat'
const SERVER_EMIT_MSG = 'add-msg'
const SERVER_EMIT_CHAT = 'add-chat'
const TYPING = 'typing'

function setupSocketAPI(http) {
  gIo = require('socket.io')(http, {
    cors: {
      origin: '*',
    },
  })
  gIo.on('connection', (socket) => {
    logger.info(`New connected socket [id: ${socket.id}]`)
    socket.on('disconnect', (socket) => {
      logger.info(`Socket disconnected [id: ${socket.id}]`)
    })
    socket.on('chat-set-topic', (topic) => {
      if (socket.myTopic === topic) return
      if (socket.myTopic) {
        socket.leave(socket.myTopic)
        logger.info(`Socket is leaving topic ${socket.myTopic} [id: ${socket.id}]`)
      }
      socket.join(topic)
      socket.myTopic = topic
    })
    socket.on(USER_LOGIN, ({ _id, chats }) => {
      logger.info(`new user logged in: ${_id}`)
      socket.userId = _id
      chats.forEach((chat) => {
        socket.join(chat._id || chat)
      })
      // console.log(gIo.sockets.adapter.rooms)
    })
    socket.on(TYPING, ({ chatId, userId }) => {
      broadcast({
        type: 'typing',
        data: chatId,
        room: chatId,
        userId,
      })
    })
    socket.on(CLIENT_EMIT_MSG, ({ chatId, addedMsg }) => {
      broadcast({
        type: SERVER_EMIT_MSG,
        data: addedMsg,
        room: chatId,
        userId: addedMsg.sentBy,
      })
    })
    socket.on(CLIENT_EMIT_CHAT, ({ chat, userId }) => {
      broadcast({
        type: SERVER_EMIT_CHAT,
        data: chat,
        room: chat._id,
        userId,
      })
    })

    socket.on('chat-send-msg', (msg) => {
      logger.info(`New chat msg from socket [id: ${socket.id}], emitting to topic ${socket.myTopic}`)
      // emits to all sockets:
      // gIo.emit('chat addMsg', msg)
      // emits only to sockets in the same room
      gIo.to(socket.myTopic).emit('chat-add-msg', msg)
    })
    socket.on('user-watch', (userId) => {
      logger.info(`user-watch from socket [id: ${socket.id}], on user ${userId}`)
      socket.join('watching:' + userId)
    })
    socket.on('set-user-socket', (userData) => {
      logger.info(`Setting socket.userId = ${userData.userId} for socket [id: ${socket.id}]`)
      socket.userId = userData.userId
      userData.userChats.forEach((chat) => socket.join(chat))
    })
    socket.on('unset-user-socket', () => {
      logger.info(`Removing socket.userId for socket [id: ${socket.id}]`)
      delete socket.userId
    })
    // socket.on('send-msg', ({ msg, chatId }) => {
    //   broadcast({
    //     type: 'add-msg',
    //     data: msg,
    //     room: chatId,
    //     userId: socket.userId,
    //   })
    // })
  })
}

function emitTo({ type, data, label }) {
  if (label) gIo.to('watching:' + label).emit(type, data)
  else gIo.emit(type, data)
}

async function emitToUser({ type, data, userId }) {
  const socket = await _getUserSocket(userId)

  if (socket) {
    logger.info(`Emiting event: ${type} to user: ${userId} socket [id: ${socket.id}]`)
    socket.emit(type, data)
  } else {
    logger.info(`No active socket for user: ${userId}`)
    // _printSockets()
  }
}

// If possible, send to all sockets BUT not the current socket
// Optionally, broadcast to a room / to all
async function broadcast({ type, data, room = null, userId }) {
  logger.info(`Broadcasting event: ${type}`)
  const excludedSocket = await _getUserSocket(userId)
  if (room && excludedSocket) {
    logger.info(`Broadcast to room ${room} excluding user: ${userId}`)
    excludedSocket.broadcast.to(room).emit(type, data)
  } else if (excludedSocket) {
    logger.info(`Broadcast to all excluding user: ${userId}`)
    excludedSocket.broadcast.emit(type, data)
  } else if (room) {
    logger.info(`Emit to room: ${room}`)
    gIo.to(room).emit(type, data)
  } else {
    logger.info(`Emit to all`)
    gIo.emit(type, data)
  }
}

async function _getUserSocket(userId) {
  const sockets = await _getAllSockets()
  const socket = sockets.find((s) => s.userId === userId)
  return socket
}
async function _getAllSockets() {
  // return all Socket instances
  const sockets = await gIo.fetchSockets()
  return sockets
}

async function _printSockets() {
  const sockets = await _getAllSockets()
  console.log(`Sockets: (count: ${sockets.length}):`)
  sockets.forEach(_printSocket)
}
function _printSocket(socket) {
  console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`)
}

async function createChatRoom({ usersIds, chatId }) {
  for (const userId of usersIds) {
    const socket = await _getUserSocket(userId)
    if (socket) socket.join(chatId)
  }
}

module.exports = {
  // set up the sockets service and define the API
  setupSocketAPI,
  // emit to everyone / everyone in a specific room (label)
  emitTo,
  // emit to a specific user (if currently active in system)
  emitToUser,
  // Send to all sockets BUT not the current socket - if found
  // (otherwise broadcast to a room / to all)
  broadcast,
  createChatRoom,
}

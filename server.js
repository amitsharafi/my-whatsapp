const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')

dotenv.config()
const app = express()
const httpServer = require('http').createServer(app)
// Express App Config
app.use(cookieParser())

app.use(express.json())
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'public')))
} else {
  const corsOptions = {
    origin: ['http://127.0.0.1:5173', 'http://127.0.0.1:8080', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://localhost:3000'],
    credentials: true,
  }
  app.use(cors(corsOptions))
}

const authRoutes = require('./api/auth/auth.routes')
const userRoutes = require('./api/user/user.routes')
const chatRoutes = require('./api/chat/chat.routes')
const fileRoutes = require('./api/file/file.routes')
const { setupSocketAPI } = require('./services/socket.service')

// routes
const setupAsyncLocalStorage = require('./middlewares/setupAls.middleware')
app.all('*', setupAsyncLocalStorage)

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/file', fileRoutes)
setupSocketAPI(httpServer)

// Make every server-side-route to match the index.html
// so when requesting http://localhost:3030/index.html/car/123 it will still respond with
// our SPA (single page app) (the index.html file) and allow vue/react-router to take it from there
app.get('/**', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const logger = require('./services/logger.service')
const port = process.env.PORT || 3030
httpServer.listen(port, () => {
  logger.info('Server is running on port: ' + port)
})

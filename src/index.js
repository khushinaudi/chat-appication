const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMsg, generateLocation} = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)  //for using socket.io
const io = socketio(server)

const publicDirectoryPath = path.join(__dirname,'../public')
const port = process.env.PORT || 3000

app.use(express.static(publicDirectoryPath))

let count = 0;

io.on('connection', (socket)=>{
    console.log('New WebSocket Connection')
    
    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({ id: socket.id, username, room })
        
        if(error){
            return callback(error)
        }

        socket.join(user.room)
    
        socket.emit('message',generateMsg('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMsg('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage',(msg, callback)=>{
      const filter = new Filter()
      const user = getUser(socket.id)

      if(filter.isProfane(msg)){
          return callback('Profanity is not allowed!')
      }

      io.to(user.room).emit('message',generateMsg(user.username, msg))
      callback()
    })
    socket.on('sendLocation',(coords,callback)=>{
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage',generateLocation(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback('Location Shared!')
    })

    socket.on('disconnect',()=>{
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message',generateMsg('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, ()=>{
    console.log(`Server up on port ${port}`);
})
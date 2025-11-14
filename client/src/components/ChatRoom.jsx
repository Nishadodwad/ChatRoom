import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { SERVER_URL } from '../api'

export default function ChatRoom({ socket, room, name, onLeave }) {
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  // load recent messages from DB when entering the room
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${SERVER_URL}/rooms/${room}/messages?limit=50`)
        // data: [{name, message, ts}]
        setMessages(data)
      } catch { /* ignore */ }
    })()
  }, [room])

  useEffect(() => {
    const onChat = (m) => setMessages((prev) => [...prev, m])
    const onSystem = (msg) => setMessages((prev) => [...prev, { name: 'system', message: msg, ts: Date.now(), system: true }])
    const onUsers = (list) => setUsers(list)

    socket.on('chat-message', onChat)
    socket.on('system-msg', onSystem)
    socket.on('users', onUsers)

    return () => {
      socket.off('chat-message', onChat)
      socket.off('system-msg', onSystem)
      socket.off('users', onUsers)
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!text.trim()) return
    socket.emit('chat-message', { room, message: text })
    setText('')
  }

  const leave = () => {
    socket.emit('leave-room', room)
    onLeave()
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="roomTitle">
          <h2>{room}</h2><span className="tag">room</span>
        </div>
        <div className="userList">
          <h3>People</h3>
          {users.map(u => <div className="user" key={u}>{u}</div>)}
        </div>
        <button className="secondary" onClick={leave}>Leave</button>
      </aside>

      <main className="chat">
        <div className="chatHeader">Signed in as <b>{name}</b></div>
        <div className="messages">
          {messages.map((m, i) => (
            m.system
              ? <div className="msg system" key={i}>• {m.message}</div>
              : <div className="msg" key={i}><b>{m.name}</b>: {m.message}</div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="composer">
          <input
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && send()}
            placeholder="Type a message…"
          />
          <button className="primary" onClick={send}>Send</button>
        </div>
      </main>
    </div>
  )
}

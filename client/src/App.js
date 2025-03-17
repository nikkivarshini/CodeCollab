import { Routes,Route } from 'react-router-dom';
import Lobby from './components/Lobby.jsx';
import Room from './components/Room.jsx';
import Signup from './components/Signup.jsx';
import Login from './components/Login.jsx';

function App() {
  return (
  <>
  <div>
    <Routes>
      <Route path='/' element = {<Signup/>}/> 
      <Route path='/signup' element = {<Signup/>}/> 
      <Route path='/lobby' element = {<Lobby/>}/>
      <Route path='/login' element = {<Login/>}/> 
      <Route path='/room/:roomId/:email' element = {<Room />}/>
    </Routes>

  </div>
  </>
  );
}

export default App;

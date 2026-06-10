const mongoose = require('mongoose');
const { Server } = require('./backend/src/models/Server');
const { User } = require('./backend/src/models/User');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/discord-clone');
  const user = await User.create({ username: 'testuser', email: 'test@test.com', password: 'password' });
  const server = await Server.create({ name: 'testserver', ownerId: user._id, members: [user._id] });
  
  const populated = await Server.findById(server._id).populate('members', 'username email');
  console.log("Populated members:", populated.members);
  
  await mongoose.disconnect();
}
test().catch(console.error);

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('./config.js')
const commands = [
{
    name : 'setup', 
    description : 'انشاء التذكرة',  
    required : true , 
   
} , 

{

      name : 'setup2', 
    description : 'انشاء التذكرة',  
    required : true , 
},

];
require('dotenv').config();


const clientID = config.bot.ClientId;

const rest = new REST({ version: '9' }).setToken(process.env.token);

(async () => {
  try {
 await rest.put(Routes.applicationCommands("1328416486326276176"), { body: commands });
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Error registering application commands:', error);
  }
})();

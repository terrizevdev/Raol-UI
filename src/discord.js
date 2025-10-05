import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands and help information'),
  
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View API statistics')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Stats action to perform')
        .setRequired(false)
        .addChoices(
          { name: 'Start auto stats (30s)', value: 'start_auto' },
          { name: 'Stop auto stats', value: 'stop_auto' },
          { name: 'View current stats', value: 'view' }
        )
    )
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time period for statistics')
        .setRequired(false)
        .addChoices(
          { name: 'Last 5 minutes', value: '5m' },
          { name: 'Last 15 minutes', value: '15m' },
          { name: 'Last 30 minutes', value: '30m' },
          { name: 'Last hour', value: '1h' },
          { name: 'Last 6 hours', value: '6h' },
          { name: 'Last 12 hours', value: '12h' },
          { name: 'Last day', value: '1d' },
          { name: 'Last 3 days', value: '3d' },
          { name: 'Last week', value: '7d' }
        )
    ),
  
  new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Toggle maintenance mode')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Enable or disable maintenance mode')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    ),
  
  new SlashCommandBuilder()
    .setName('activity')
    .setDescription('Manage bot activity status')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Activity action to perform')
        .setRequired(true)
        .addChoices(
          { name: 'Set custom activity', value: 'set_custom' },
          { name: 'Reset to auto', value: 'reset_auto' },
          { name: 'Show current', value: 'show_current' }
        )
    )
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Custom status text (only for set_custom action)')
        .setRequired(false)
    ),
  
  new SlashCommandBuilder()
    .setName('apikey')
    .setDescription('Manage API keys')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add new API key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('API key to add')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name for the API key')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Category for the API key')
            .setRequired(true)
            .addChoices(
              { name: 'Free', value: 'free' },
              { name: 'Premium', value: 'premium' },
              { name: 'VIP', value: 'vip' },
              { name: 'Admin', value: 'admin' }
            )
        )
        .addStringOption(option =>
          option.setName('ratelimit')
            .setDescription('Rate limit for the API key')
            .setRequired(true)
            .addChoices(
              { name: '100/minute', value: '100/minute' },
              { name: '500/minute', value: '500/minute' },
              { name: '1000/minute', value: '1000/minute' },
              { name: '5000/day', value: '5000/day' },
              { name: '10000/day', value: '10000/day' },
              { name: '50000/day', value: '50000/day' },
              { name: 'Unlimited', value: 'unlimited' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete API key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('API key to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable API key requirement')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Enable or disable API key requirement')
            .setRequired(true)
            .addChoices(
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all API keys')
    )
]

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

let statsData = {
  totalRequests: 0,
  requestsByTime: new Map(),
  startTime: Date.now(),
  lastReset: Date.now()
}

let autoStatsChannel = null
let autoStatsMessage = null
let autoStatsInterval = null
let customActivity = null

client.once('ready', async () => {
  console.log(`Discord bot logged in as ${client.user.tag}`)
  
  try {
    console.log('Started refreshing application (/) commands.')
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    )
    console.log('Successfully reloaded application (/) commands.')
  } catch (error) {
    console.error('Error refreshing application commands:', error)
  }

  setInterval(() => {
    if (!customActivity) {
      const activities = [
        { name: 'API requests', type: 3 },
        { name: 'with RaolByte APIs', type: 0 },
        { name: 'the server status', type: 3 },
        { name: 'API documentation', type: 3 }
      ]
      const randomActivity = activities[Math.floor(Math.random() * activities.length)]
      client.user.setActivity(randomActivity.name, { type: randomActivity.type })
    }
  }, 30000) // Change every 30 seconds
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction

  try {
    switch (commandName) {
      case 'help':
        await handleHelp(interaction)
        break
      case 'stats':
        await handleStats(interaction)
        break
      case 'activity':
        await handleActivity(interaction)
        break
      case 'maintenance':
        await handleMaintenance(interaction)
        break
      case 'apikey':
        await handleApiKey(interaction)
        break
    }
  } catch (error) {
    console.error('Error handling interaction:', error)
    await interaction.reply({ content: 'An error occurred while processing the command.', ephemeral: true })
  }
})

function updateStats() {
  statsData.totalRequests++
  const now = Date.now()
  const timeKey = Math.floor(now / 60000)
  
  if (!statsData.requestsByTime.has(timeKey)) {
    statsData.requestsByTime.set(timeKey, 0)
  }
  statsData.requestsByTime.set(timeKey, statsData.requestsByTime.get(timeKey) + 1)
}

function getTimeRange(timeStr) {
  const now = Date.now()
  let startTime = now
  
  switch (timeStr) {
    case '5m':
      startTime = now - (5 * 60 * 1000)
      break
    case '15m':
      startTime = now - (15 * 60 * 1000)
      break
    case '30m':
      startTime = now - (30 * 60 * 1000)
      break
    case '1h':
      startTime = now - (60 * 60 * 1000)
      break
    case '6h':
      startTime = now - (6 * 60 * 60 * 1000)
      break
    case '12h':
      startTime = now - (12 * 60 * 60 * 1000)
      break
    case '1d':
      startTime = now - (24 * 60 * 60 * 1000)
      break
    case '3d':
      startTime = now - (3 * 24 * 60 * 60 * 1000)
      break
    case '7d':
      startTime = now - (7 * 24 * 60 * 60 * 1000)
      break
    default:
      startTime = now - (30 * 60 * 1000)
  }
  
  return { startTime, endTime: now }
}

async function generateStatsEmbed(timeStr = '30m') {
  const { startTime, endTime } = getTimeRange(timeStr)
  const uptime = Math.floor((Date.now() - statsData.startTime) / 1000)
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`
  
  let requestsInPeriod = 0
  const startMinute = Math.floor(startTime / 60000)
  const endMinute = Math.floor(endTime / 60000)
  
  for (let minute = startMinute; minute <= endMinute; minute++) {
    if (statsData.requestsByTime.has(minute)) {
      requestsInPeriod += statsData.requestsByTime.get(minute)
    }
  }
  
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  const cpuUsage = process.cpuUsage()
  
  const embed = new EmbedBuilder()
    .setTitle('📊 API Statistics')
    .setColor(0x00ff00)
    .setTimestamp()
    .addFields(
      { name: 'Status', value: '🟢 Online', inline: true },
      { name: 'Uptime', value: uptimeStr, inline: true },
      { name: 'Memory Usage', value: `${memoryUsage} MB`, inline: true },
      { name: 'Total Requests', value: statsData.totalRequests.toString(), inline: true },
      { name: `Requests (${timeStr})`, value: requestsInPeriod.toString(), inline: true },
      { name: 'CPU Usage', value: `${Math.round(cpuUsage.user / 1000000)}ms`, inline: true }
    )

  return embed
}

async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🤖 RaolByte API Bot Commands')
    .setColor(0x0099ff)
    .setDescription('Here are all available commands for the RaolByte API bot:')
    .addFields(
      { name: '📊 `/stats`', value: 'View API statistics and manage auto-updating stats', inline: false },
      { name: '🎮 `/activity`', value: 'Manage bot activity status (custom/auto)', inline: false },
      { name: '🔧 `/maintenance`', value: 'Toggle maintenance mode for the API', inline: false },
      { name: '🔑 `/apikey`', value: 'Manage API keys with categories and rate limits', inline: false }
    )
    .addFields(
      { name: '📊 Stats Options', value: '• `action:Start auto stats (30s)` - Enable auto-updating stats\n• `action:Stop auto stats` - Disable auto-updating stats\n• `action:View current stats` - Show current statistics', inline: false },
      { name: '🎮 Activity Options', value: '• `action:Set custom activity` - Set custom bot status\n• `action:Reset to auto` - Reset to automatic status\n• `action:Show current` - Show current activity', inline: false },
      { name: '🔑 API Key Categories', value: '• **Free** - Basic access with limited rate limits\n• **Premium** - Enhanced access with higher limits\n• **VIP** - Priority access with premium limits\n• **Admin** - Full access with unlimited rate limits', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'RaolByte API Bot • Use /help for more information' })

  await interaction.reply({ embeds: [embed] })
}

async function handleStats(interaction) {
  const action = interaction.options.getString('action') || 'view'
  const timeStr = interaction.options.getString('time') || '30m'
  
  switch (action) {
    case 'start_auto':
      if (autoStatsInterval) {
        clearInterval(autoStatsInterval)
      }
      
      autoStatsChannel = interaction.channel
      const embed = await generateStatsEmbed(timeStr)
      const message = await interaction.reply({ embeds: [embed], fetchReply: true })
      autoStatsMessage = message
      
      autoStatsInterval = setInterval(async () => {
        if (autoStatsChannel && autoStatsMessage) {
          try {
            const updatedEmbed = await generateStatsEmbed(timeStr)
            await autoStatsMessage.edit({ embeds: [updatedEmbed] })
          } catch (error) {
            console.error('Error updating auto stats:', error)
          }
        }
      }, 30000) // 30 seconds
      
      await interaction.followUp({ content: '✅ Auto stats enabled! Stats will update every 30 seconds.', ephemeral: true })
      break
      
    case 'stop_auto':
      if (autoStatsInterval) {
        clearInterval(autoStatsInterval)
        autoStatsInterval = null
        autoStatsChannel = null
        autoStatsMessage = null
        await interaction.reply({ content: '✅ Auto stats disabled!', ephemeral: true })
      } else {
        await interaction.reply({ content: '❌ Auto stats is not currently enabled.', ephemeral: true })
      }
      break
      
    case 'view':
    default:
      const statsEmbed = await generateStatsEmbed(timeStr)
      await interaction.reply({ embeds: [statsEmbed] })
      break
  }
}

async function handleActivity(interaction) {
  const action = interaction.options.getString('action')
  const status = interaction.options.getString('status')
  
  try {
    switch (action) {
      case 'set_custom':
        if (!status) {
          await interaction.reply({ content: '❌ Please provide a custom status text!', ephemeral: true })
          return
        }
        
        customActivity = status
        await client.user.setActivity(status, { type: 3 }) // 3 = WATCHING
        
        const setEmbed = new EmbedBuilder()
          .setTitle('🎮 Activity Status')
          .setColor(0x00ff00)
          .setDescription(`✅ Custom activity set to: **${status}**`)
          .setTimestamp()
        
        await interaction.reply({ embeds: [setEmbed] })
        break
        
      case 'reset_auto':
        customActivity = null
        await client.user.setActivity('API requests', { type: 3 })
        
        const resetEmbed = new EmbedBuilder()
          .setTitle('🎮 Activity Status')
          .setColor(0x0099ff)
          .setDescription('✅ Activity reset to automatic rotation')
          .setTimestamp()
        
        await interaction.reply({ embeds: [resetEmbed] })
        break
        
      case 'show_current':
        const currentActivity = client.user.presence.activities[0]
        const activityText = currentActivity ? `${currentActivity.name} (${getActivityTypeName(currentActivity.type)})` : 'No activity set'
        
        const showEmbed = new EmbedBuilder()
          .setTitle('🎮 Current Activity')
          .setColor(0x0099ff)
          .setDescription(`**Current Status:** ${activityText}\n**Mode:** ${customActivity ? 'Custom' : 'Automatic'}`)
          .setTimestamp()
        
        await interaction.reply({ embeds: [showEmbed] })
        break
    }
  } catch (error) {
    console.error('Error handling activity command:', error)
    await interaction.reply({ content: '❌ Error managing activity status.', ephemeral: true })
  }
}

function getActivityTypeName(type) {
  const types = {
    0: 'Playing',
    1: 'Streaming',
    2: 'Listening',
    3: 'Watching',
    4: 'Custom',
    5: 'Competing'
  }
  return types[type] || 'Unknown'
}

async function handleMaintenance(interaction) {
  const action = interaction.options.getString('action')
  const enabled = action === 'on'
  
  try {
    const settingsPath = path.join(__dirname, 'settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    
    if (!settings.maintenance) {
      settings.maintenance = {}
    }
    
    settings.maintenance.enabled = enabled
    settings.maintenance.message = enabled ? 'API is currently under maintenance. Please try again later.' : ''
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 Maintenance Mode')
      .setColor(enabled ? 0xff9900 : 0x00ff00)
      .setDescription(`Maintenance mode has been ${enabled ? 'enabled' : 'disabled'}.`)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: 'Error updating maintenance mode.', ephemeral: true })
  }
}

async function handleApiKey(interaction) {
  const subcommand = interaction.options.getSubcommand()
  
  try {
    const settingsPath = path.join(__dirname, 'settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    
    if (!settings.apiKeys) {
      settings.apiKeys = []
    }
    
    if (!settings.apiSettings) {
      settings.apiSettings = {}
    }
    
    if (!settings.apiSettings.apikey) {
      settings.apiSettings.apikey = {}
    }
    
    switch (subcommand) {
      case 'add':
        const key = interaction.options.getString('key')
        const name = interaction.options.getString('name')
        const category = interaction.options.getString('category')
        const ratelimit = interaction.options.getString('ratelimit')
        
        if (settings.apiKeys.some(k => k.key === key) || settings.apiSettings.apikey[key]) {
          await interaction.reply({ content: '❌ API key already exists!', ephemeral: true })
          return
        }
        
        settings.apiKeys.push({ 
          key, 
          name, 
          category,
          ratelimit,
          active: true, 
          createdAt: new Date().toISOString() 
        })
        
        settings.apiSettings.apikey[key] = {
          rateLimit: ratelimit,
          enabled: true,
          category: category,
          name: name
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        
        const addEmbed = new EmbedBuilder()
          .setTitle('🔑 API Key Added')
          .setColor(0x00ff00)
          .setDescription(`✅ API key **${name}** added successfully!`)
          .addFields(
            { name: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
            { name: 'Rate Limit', value: ratelimit, inline: true },
            { name: 'Key Preview', value: `\`${key.substring(0, 8)}...\``, inline: true }
          )
          .setTimestamp()
        
        await interaction.reply({ embeds: [addEmbed], ephemeral: true })
        break
        
      case 'delete':
        const keyToDelete = interaction.options.getString('key')
        const keyIndex = settings.apiKeys.findIndex(k => k.key === keyToDelete)
        
        if (keyIndex === -1 && !settings.apiSettings.apikey[keyToDelete]) {
          await interaction.reply({ content: '❌ API key not found!', ephemeral: true })
          return
        }
        
        let deletedKey = null
        if (keyIndex !== -1) {
          deletedKey = settings.apiKeys.splice(keyIndex, 1)[0]
        }
        
        if (settings.apiSettings.apikey[keyToDelete]) {
          if (!deletedKey) {
            deletedKey = {
              name: settings.apiSettings.apikey[keyToDelete].name || 'Unknown',
              key: keyToDelete
            }
          }
          delete settings.apiSettings.apikey[keyToDelete]
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        
        await interaction.reply({ content: `✅ API key **${deletedKey.name}** deleted successfully!`, ephemeral: true })
        break
        
      case 'toggle':
        const toggleAction = interaction.options.getString('action')
        settings.apiSettings.requireApikey = toggleAction === 'enable'
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        
        const toggleEmbed = new EmbedBuilder()
          .setTitle('🔧 API Key Requirement')
          .setColor(toggleAction === 'enable' ? 0x00ff00 : 0xff9900)
          .setDescription(`API key requirement has been **${toggleAction === 'enable' ? 'enabled' : 'disabled'}**!`)
          .setTimestamp()
        
        await interaction.reply({ embeds: [toggleEmbed] })
        break
        
      case 'list':
        const allApiKeys = []
        
        settings.apiKeys.forEach(apiKey => {
          allApiKeys.push({
            ...apiKey,
            source: 'array'
          })
        })
        
        Object.entries(settings.apiSettings.apikey).forEach(([key, config]) => {
          if (!settings.apiKeys.some(k => k.key === key)) {
            allApiKeys.push({
              key: key,
              name: config.name || 'Default Key',
              category: config.category || 'default',
              ratelimit: config.rateLimit || 'unlimited',
              active: config.enabled !== false,
              createdAt: 'Default',
              source: 'default'
            })
          }
        })
        
        if (allApiKeys.length === 0) {
          await interaction.reply({ content: '❌ No API keys found!', ephemeral: true })
          return
        }
        
        const embed = new EmbedBuilder()
          .setTitle('🔑 API Keys List')
          .setColor(0x0099ff)
          .setDescription(`Found **${allApiKeys.length}** API key(s)`)
          .setTimestamp()
        
        allApiKeys.forEach((apiKey, index) => {
          const categoryEmoji = {
            'free': '🆓',
            'premium': '⭐',
            'vip': '💎',
            'admin': '👑',
            'default': '🔧'
          }[apiKey.category] || '❓'
          
          embed.addFields({
            name: `${index + 1}. ${categoryEmoji} ${apiKey.name}`,
            value: `**Key:** \`${apiKey.key.substring(0, 8)}...\`\n**Category:** ${apiKey.category.charAt(0).toUpperCase() + apiKey.category.slice(1)}\n**Rate Limit:** ${apiKey.ratelimit}\n**Status:** ${apiKey.active ? '✅ Active' : '❌ Inactive'}\n**Created:** ${apiKey.createdAt}\n**Source:** ${apiKey.source === 'default' ? 'Default' : 'Custom'}`,
            inline: false
          })
        })
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
    }
  } catch (error) {
    console.error('Error handling API key command:', error)
    await interaction.reply({ content: '❌ Error managing API keys.', ephemeral: true })
  }
}

export function startDiscordBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.log('Discord token not found. Skipping Discord bot initialization.')
    return
  }

  client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error)
  })
}

export { updateStats }

export default client
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
    .setName('stats')
    .setDescription('Check API statistics')
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
    ),
  
  new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the API server')
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

  setInterval(async () => {
    if (autoStatsChannel && autoStatsMessage) {
      try {
        const embed = await generateStatsEmbed('30m')
        await autoStatsMessage.edit({ embeds: [embed] })
      } catch (error) {
        console.error('Error updating auto stats:', error)
      }
    }
  }, 30 * 60 * 1000)
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction

  try {
    switch (commandName) {
      case 'stats':
        await handleStats(interaction)
        break
      case 'maintenance':
        await handleMaintenance(interaction)
        break
      case 'apikey':
        await handleApiKey(interaction)
        break
      case 'restart':
        await handleRestart(interaction)
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

async function handleStats(interaction) {
  const timeStr = interaction.options.getString('time') || '30m'
  const embed = await generateStatsEmbed(timeStr)
  
  if (interaction.options.getString('setup-auto') === 'true') {
    autoStatsChannel = interaction.channel
    const message = await interaction.reply({ embeds: [embed], fetchReply: true })
    autoStatsMessage = message
    await interaction.followUp({ content: 'Auto stats enabled! Stats will update every 30 minutes.', ephemeral: true })
  } else {
    await interaction.reply({ embeds: [embed] })
  }
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
    
    switch (subcommand) {
      case 'add':
        const key = interaction.options.getString('key')
        const name = interaction.options.getString('name')
        
        if (settings.apiKeys.some(k => k.key === key)) {
          await interaction.reply({ content: 'API key already exists!', ephemeral: true })
          return
        }
        
        settings.apiKeys.push({ key, name, active: true, createdAt: new Date().toISOString() })
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        
        await interaction.reply({ content: `API key "${name}" added successfully!`, ephemeral: true })
        break
        
      case 'delete':
        const keyToDelete = interaction.options.getString('key')
        const keyIndex = settings.apiKeys.findIndex(k => k.key === keyToDelete)
        
        if (keyIndex === -1) {
          await interaction.reply({ content: 'API key not found!', ephemeral: true })
          return
        }
        
        const deletedKey = settings.apiKeys.splice(keyIndex, 1)[0]
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        
        await interaction.reply({ content: `API key "${deletedKey.name}" deleted successfully!`, ephemeral: true })
        break
        
      case 'toggle':
        const toggleAction = interaction.options.getString('action')
        settings.apiSettings = settings.apiSettings || {}
        settings.apiSettings.requireApikey = toggleAction === 'enable'
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        
        await interaction.reply({ content: `API key requirement ${toggleAction === 'enable' ? 'enabled' : 'disabled'}!`, ephemeral: true })
        break
        
      case 'list':
        if (settings.apiKeys.length === 0) {
          await interaction.reply({ content: 'No API keys found!', ephemeral: true })
          return
        }
        
        const embed = new EmbedBuilder()
          .setTitle('🔑 API Keys')
          .setColor(0x0099ff)
          .setTimestamp()
        
        settings.apiKeys.forEach((apiKey, index) => {
          embed.addFields({
            name: `${index + 1}. ${apiKey.name}`,
            value: `Key: \`${apiKey.key.substring(0, 8)}...\`\nStatus: ${apiKey.active ? '✅ Active' : '❌ Inactive'}\nCreated: ${new Date(apiKey.createdAt).toLocaleDateString()}`,
            inline: false
          })
        })
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
    }
  } catch (error) {
    await interaction.reply({ content: 'Error managing API keys.', ephemeral: true })
  }
}

async function handleRestart(interaction) {
  try {
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Server Restart Confirmation')
      .setDescription('Are you sure you want to restart the API server?')
      .setColor(0xff9900)
      .addFields(
        { name: 'Warning', value: 'This will temporarily disconnect all active connections', inline: false },
        { name: 'Duration', value: 'Restart typically takes 2-5 seconds', inline: true },
        { name: 'Status', value: 'All data will be preserved', inline: true }
      )
      .setFooter({ text: 'React with ✅ to confirm or ❌ to cancel' })
      .setTimestamp()

    const confirmMessage = await interaction.reply({ 
      embeds: [confirmEmbed], 
      fetchReply: true 
    })

    await confirmMessage.react('✅')
    await confirmMessage.react('❌')

    const filter = (reaction, user) => {
      return ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id
    }

    try {
      const collected = await confirmMessage.awaitReactions({ 
        filter, 
        max: 1, 
        time: 30000, 
        errors: ['time'] 
      })

      const reaction = collected.first()
      
      if (reaction.emoji.name === '❌') {
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Restart Cancelled')
          .setDescription('Server restart has been cancelled.')
          .setColor(0xff0000)
          .setTimestamp()

        await interaction.editReply({ embeds: [cancelEmbed], components: [] })
        return
      }

      if (reaction.emoji.name === '✅') {
        const restartEmbed = new EmbedBuilder()
          .setTitle('🔄 Restarting Server...')
          .setDescription('The API server is being restarted. Please wait...')
          .setColor(0x0099ff)
          .setTimestamp()

        await interaction.editReply({ embeds: [restartEmbed], components: [] })

        setTimeout(() => {
          console.log('Discord bot initiated server restart')
          process.exit(0)
        }, 2000)

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Restart Initiated')
          .setDescription('Server restart has been initiated successfully.')
          .setColor(0x00ff00)
          .setTimestamp()

        await interaction.followUp({ embeds: [successEmbed], ephemeral: true })
      }

    } catch (error) {
      if (error.name === 'TimeoutError') {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏰ Restart Timeout')
          .setDescription('Restart confirmation timed out. Please try again.')
          .setColor(0xff9900)
          .setTimestamp()

        await interaction.editReply({ embeds: [timeoutEmbed], components: [] })
      } else {
        throw error
      }
    }

  } catch (error) {
    console.error('Error in restart command:', error)
    
    try {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Restart Error')
        .setDescription('An error occurred while processing the restart command.')
        .setColor(0xff0000)
        .setTimestamp()

      await interaction.editReply({ embeds: [errorEmbed], components: [] })
    } catch (replyError) {
      console.error('Failed to send error message:', replyError)
    }
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
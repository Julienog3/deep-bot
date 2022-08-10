const { SlashCommandBuilder } = require('@discordjs/builders');
const sequelize = require('../sequelize');

const { Client } = require("@notionhq/client");
const {  MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

require('dotenv').config();

const Users = sequelize.model('user');

sequelize.sync({ force: false, alter: true });

const rarities = [
    {
        name: 'Commune',
        color: '#707070',
        probability: 100,
        price: 10
    },
    {
        name: 'Peu commune',
        color: '#009e35',
        probability: 50
    },
    {
        name: 'Rare',
        color: '#0073ff',
        probability: 25,
        price: 100
    },
    {
        name: 'Epique',
        color: '#b300ff',
        probability: 10,
        price: 500
    },
    {
        name: 'Légendaire',
        color: '#ffd000',
        probability: 1,
        price: 1000
    },
]

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
})

const databaseId = process.env.NOTION_DATABASE_ID;

const getArtists = async () => {
    const notionPages = await notion.databases.query({ database_id: databaseId }).then((res) => res.results);
    return notionPages;
}

const getRarity = () => {
    const roll = Math.floor(Math.random() * 100);

    const res = rarities.filter(({ probability }) => roll <= probability).sort((a, b) => a.probability - b.probability)
    return res[0];
}


const getProperties = async (pageId, propertyId) => {    
    const response = await notion.pages.properties.retrieve({ page_id: pageId, property_id: propertyId });
    return response;
}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('card')
		.setDescription('Donne une carte aléatoire représentant un artiste'),
	async execute(interaction) {

        const user = await Users.findOne({ where: { id: interaction.member.id } });
        
        const artists = await getArtists();
        
        const selectedArtist = artists[Math.floor(Math.random() * artists.length)]
        
        const name = await getProperties(selectedArtist.id, process.env.NOTION_NAME_ID).then((res) => res.results[0].title.text.content)
        const image = await getProperties(selectedArtist.id, process.env.NOTION_IMAGE_ID).then((res) => res.files[0].file.url)
        
        const rarity = getRarity();

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('collect')
                    .setLabel('Récupérer')
                    .setStyle('SUCCESS'),
            )
            .addComponents(
                new MessageButton()
                    .setCustomId('sell')
                    .setLabel('Vendre')
                    .setStyle('DANGER')
                    .setEmoji('💰')
            );

        const cardEmbed = new MessageEmbed()
            .setTitle(`🃏 Vous avez obtenu **${name}**`)
            .addFields({ name: 'Rareté', value: rarity.name, inline: true })
            .setDescription(`Il ne te reste plus que ${user.cards - 1} carte${user.cards > 1 ? 's' : ''} à ouvrir`)
            .setColor(rarity.color)
            .setImage(image)

        

        if(user) {
            if (user.cards > 0) {
                await Users.decrement('cards', { where: { id: interaction.member.id } })

                await interaction.deferReply();
                return interaction.editReply({ embeds: [cardEmbed], components: [row] });
            } else {
                return interaction.reply("Désolé tu n'as plus de cartes pour aujourd'hui, reviens demain 👋")
            }
        } else {
            try {
                const user = await Users.create({
                    id: interaction.author.id,
                    username: interaction.author.username,
                })

                await Users.decrement('cards', { where: { id: interaction.member.id } })

                await interaction.deferReply();
                return interaction.editReply({ embeds: [cardEmbed], components: [row] });
            } catch(error) {        
                console.log(error);
            }
        }
	},
};

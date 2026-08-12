const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// =====================================================
// 🌙 APRESMINUIT — GIVEAWAY BOT V10
// =====================================================

const PREFIX = "-";
const giveaways = new Map();

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// =====================================================
// OUTILS
// =====================================================

function parseDuration(value) {
  if (!value) return null;

  const match = /^(\d+)(s|m|h|d|w)$/i.exec(value);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return amount * units[unit];
}

function chooseWinners(participants, amount) {
  const shuffled = [...participants];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled.slice(
    0,
    Math.min(amount, shuffled.length)
  );
}

// =====================================================
// EMBED ACTIF
// =====================================================

function activeEmbed(giveaway, guild) {
  return new EmbedBuilder()
    .setAuthor({
      name: "APRESMINUIT • GIVEAWAY",
      iconURL:
        guild.iconURL({ size: 256 }) || undefined,
    })
    .setTitle("🎁  GIVEAWAY")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "              ✦",
        "        **UNE SURPRISE VOUS ATTEND**",
        "",
        `## 🎁 ${giveaway.prize}`,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        `🏆 **Gagnant${giveaway.winners > 1 ? "s" : ""} :** ${giveaway.winners}`,
        `👥 **Participants :** ${giveaway.participants.size}`,
        `⏰ **Fin :** <t:${Math.floor(
          giveaway.endsAt / 1000
        )}:R>`,
        "",
        `👑 **Organisé par :** <@${giveaway.hostId}>`,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "### ✦ COMMENT PARTICIPER ?",
        "",
        "Clique sur le bouton **Participer**",
        "pour rejoindre le tirage.",
        "",
        "🍀 **Bonne chance à tous.**",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setThumbnail(
      guild.iconURL({ size: 256 }) || null
    )
    .setFooter({
      text: "🌙 ApresMinuit • Giveaways Premium",
    })
    .setTimestamp();
}

// =====================================================
// BOUTONS ACTIFS
// =====================================================

function activeButtons(giveaway) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_join:${giveaway.id}`)
      .setLabel(
        `Participer • ${giveaway.participants.size}`
      )
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary)
  );
}

// =====================================================
// EMBED TERMINÉ
// =====================================================

function finishedEmbed(giveaway, guild, winners) {
  const winnerText = winners.length
    ? winners.map((id) => `<@${id}>`).join("\n")
    : "Aucun gagnant";

  return new EmbedBuilder()
    .setAuthor({
      name: "APRESMINUIT • GIVEAWAY",
      iconURL:
        guild.iconURL({ size: 256 }) || undefined,
    })
    .setTitle("🏆  GIVEAWAY TERMINÉ")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "              ✦",
        "          **LE TIRAGE EST TERMINÉ**",
        "",
        `## 🎁 ${giveaway.prize}`,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "🏆 **GAGNANT(S)**",
        "",
        winnerText,
        "",
        "🎉 **Félicitations !**",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        `👥 **Participants :** ${giveaway.participants.size}`,
        `🏆 **Gagnant${winners.length > 1 ? "s" : ""} :** ${winners.length}`,
        `👑 **Organisé par :** <@${giveaway.hostId}>`,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "🌙 Merci à tous pour votre participation.",
      ].join("\n")
    )
    .setColor(0xffc107)
    .setThumbnail(
      guild.iconURL({ size: 256 }) || null
    )
    .setFooter({
      text: "🌙 ApresMinuit • Giveaway terminé",
    })
    .setTimestamp();
}

// =====================================================
// BOUTONS TERMINÉS
// =====================================================

function finishedButtons(giveaway) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `giveaway_finished:${giveaway.id}`
      )
      .setLabel(
        `${giveaway.participants.size} participants`
      )
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId(
        `giveaway_reroll:${giveaway.id}`
      )
      .setLabel("Reroll")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary)
  );
}

// =====================================================
// ACTUALISATION
// =====================================================

async function refreshGiveaway(giveaway) {
  try {
    const channel = await client.channels.fetch(
      giveaway.channelId
    );

    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(
      giveaway.messageId
    );

    await message.edit({
      embeds: [
        activeEmbed(
          giveaway,
          channel.guild
        ),
      ],
      components: [
        activeButtons(giveaway),
      ],
    });
  } catch (error) {
    console.error(
      "❌ Refresh giveaway :",
      error
    );
  }
}

// =====================================================
// FIN DU GIVEAWAY
// =====================================================

async function finishGiveaway(giveaway) {
  try {
    const channel = await client.channels.fetch(
      giveaway.channelId
    );

    if (!channel?.isTextBased()) {
      giveaways.delete(giveaway.id);
      return;
    }

    const winners = chooseWinners(
      [...giveaway.participants],
      giveaway.winners
    );

    const message = await channel.messages.fetch(
      giveaway.messageId
    );

    await message.edit({
      content: winners.length
        ? `🎉 **Félicitations ${winners
            .map((id) => `<@${id}>`)
            .join(" ")} !**`
        : "❌ **Giveaway terminé — aucun participant.**",
      embeds: [
        finishedEmbed(
          giveaway,
          channel.guild,
          winners
        ),
      ],
      components: [
        finishedButtons(giveaway),
      ],
    });

    if (winners.length) {
      const winnerEmbed = new EmbedBuilder()
        .setTitle("🏆  FÉLICITATIONS")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "🎁 **PRIX REMPORTÉ**",
            "",
            `## ${giveaway.prize}`,
            "",
            "🏆 **Gagnant(s)**",
            winners
              .map((id) => `<@${id}>`)
              .join("\n"),
            "",
            "📩 Contactez l'organisateur",
            "pour récupérer votre récompense.",
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "🌙 **APRESMINUIT**",
          ].join("\n")
        )
        .setColor(0xffc107)
        .setTimestamp();

      await channel.send({
        content: winners
          .map((id) => `<@${id}>`)
          .join(" "),
        embeds: [winnerEmbed],
      });
    }

    // On garde les données terminées
    // pour permettre le reroll.
    giveaway.finished = true;
    giveaway.winnerIds = winners;
  } catch (error) {
    console.error(
      "❌ Finish giveaway :",
      error
    );
  }
}

// =====================================================
// BOUTONS
// =====================================================

client.on(
  "interactionCreate",
  async (interaction) => {
    if (!interaction.isButton()) return;

    // ===============================================
    // PARTICIPATION
    // ===============================================

    if (
      interaction.customId.startsWith(
        "giveaway_join:"
      )
    ) {
      const id =
        interaction.customId.split(":")[1];

      const giveaway = giveaways.get(id);

      if (!giveaway || giveaway.finished) {
        return interaction.reply({
          content:
            "❌ Ce giveaway est terminé.",
          ephemeral: true,
        });
      }

      if (Date.now() >= giveaway.endsAt) {
        return interaction.reply({
          content:
            "⏰ Ce giveaway est terminé.",
          ephemeral: true,
        });
      }

      if (
        giveaway.participants.has(
          interaction.user.id
        )
      ) {
        giveaway.participants.delete(
          interaction.user.id
        );

        await refreshGiveaway(giveaway);

        return interaction.reply({
          content:
            "↩️ **Ta participation a été retirée.**",
          ephemeral: true,
        });
      }

      giveaway.participants.add(
        interaction.user.id
      );

      await refreshGiveaway(giveaway);

      return interaction.reply({
        content:
          "🎉 **Participation enregistrée !**\n\n🍀 Bonne chance !",
        ephemeral: true,
      });
    }

    // ===============================================
    // REROLL
    // ===============================================

    if (
      interaction.customId.startsWith(
        "giveaway_reroll:"
      )
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "❌ Tu n'as pas la permission de faire un reroll.",
          ephemeral: true,
        });
      }

      const id =
        interaction.customId.split(":")[1];

      const giveaway = giveaways.get(id);

      if (!giveaway || !giveaway.finished) {
        return interaction.reply({
          content:
            "❌ Ce giveaway n'est pas disponible pour un reroll.",
          ephemeral: true,
        });
      }

      const participants =
        [...giveaway.participants];

      if (!participants.length) {
        return interaction.reply({
          content:
            "❌ Aucun participant disponible.",
          ephemeral: true,
        });
      }

      const winners = chooseWinners(
        participants,
        giveaway.winners
      );

      const mentions = winners
        .map((id) => `<@${id}>`)
        .join(" ");

      const embed = new EmbedBuilder()
        .setTitle("🔄  NOUVEAU TIRAGE")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "🎁 **PRIX**",
            "",
            `## ${giveaway.prize}`,
            "",
            "🏆 **NOUVEAU GAGNANT**",
            "",
            mentions,
            "",
            "🎉 Félicitations !",
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "🌙 **APRESMINUIT**",
          ].join("\n")
        )
        .setColor(0x8b5cf6)
        .setTimestamp();

      await interaction.channel.send({
        content: `🔄 **Nouveau tirage !** ${mentions}`,
        embeds: [embed],
      });

      return interaction.reply({
        content:
          "✅ **Reroll effectué avec succès.**",
        ephemeral: true,
      });
    }
  }
);

// =====================================================
// COMMANDES
// =====================================================

client.on(
  "messageCreate",
  async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (
      !message.content.startsWith(PREFIX)
    ) {
      return;
    }

    const args = message.content
      .slice(PREFIX.length)
      .trim()
      .split(/\s+/);

    const command =
      args.shift()?.toLowerCase();

    // ===============================================
    // GIVEAWAY
    // ===============================================

    if (command === "giveaway") {
      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ManageGuild
        )
      ) {
        return message.reply({
          content:
            "❌ Tu n'as pas la permission de créer un giveaway.",
        });
      }

      /*
       * Exemple :
       *
       * -giveaway 2h 1 Discord Nitro
       *
       * 2h = durée
       * 1  = nombre de gagnants
       * reste = prix
       */

      const duration =
        parseDuration(args[0]);

      const winners =
        Number(args[1]);

      const prize =
        args.slice(2).join(" ");

      // =============================================
      // VALIDATION
      // =============================================

      if (!duration) {
        return message.reply({
          content: [
            "❌ **Durée invalide.**",
            "",
            "Exemples :",
            "`30s` • `10m` • `2h` • `1d` • `1w`",
          ].join("\n"),
        });
      }

      if (duration < 10000) {
        return message.reply({
          content:
            "❌ La durée minimale est de **10 secondes**.",
        });
      }

      if (
        !Number.isInteger(winners) ||
        winners < 1 ||
        winners > 20
      ) {
        return message.reply({
          content:
            "❌ Le nombre de gagnants doit être compris entre **1 et 20**.",
        });
      }

      if (!prize) {
        return message.reply({
          content:
            "❌ Tu dois indiquer un prix.\n\nExemple : `-giveaway 2h 1 Discord Nitro`",
        });
      }

      // =============================================
      // CRÉATION
      // =============================================

      const id =
        `${message.guild.id}-${Date.now()}`;

      const giveaway = {
        id,
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: null,
        hostId: message.author.id,
        prize,
        winners,
        endsAt: Date.now() + duration,
        participants: new Set(),
        finished: false,
        winnerIds: [],
      };

      giveaways.set(id, giveaway);

      const giveawayMessage =
        await message.channel.send({
          embeds: [
            activeEmbed(
              giveaway,
              message.guild
            ),
          ],
          components: [
            activeButtons(giveaway),
          ],
        });

      giveaway.messageId =
        giveawayMessage.id;

      await message.delete().catch(
        () => {}
      );

      // =============================================
      // FIN AUTOMATIQUE
      // =============================================

      setTimeout(() => {
        finishGiveaway(giveaway);
      }, duration);

      return;
    }

    // ===============================================
    // HELP
    // ===============================================

    if (command === "giveawayhelp") {
      const embed = new EmbedBuilder()
        .setTitle(
          "🌙 APRESMINUIT • GIVEAWAY"
        )
        .setDescription(
          [
            "Un système de giveaways **premium**.",
            "",
            "### 🎁 CRÉER UN GIVEAWAY",
            "`-giveaway 2h 1 Discord Nitro`",
            "",
            "### ⏱️ DURÉES",
            "`s` secondes",
            "`m` minutes",
            "`h` heures",
            "`d` jours",
            "`w` semaines",
            "",
            "### ✦ EXEMPLE",
            "`-giveaway 1d 3 50€`",
            "",
            "🏆 Plusieurs gagnants disponibles.",
            "🖱️ Participation avec bouton.",
            "🔄 Reroll disponible après le tirage.",
          ].join("\n")
        )
        .setColor(0x5865f2)
        .setFooter({
          text:
            "🌙 ApresMinuit • Giveaway Premium",
        });

      return message.reply({
        embeds: [embed],
      });
    }
  }
);

// =====================================================
// READY
// =====================================================

client.once("ready", () => {
  console.log(
    `🌙 ${client.user.tag} est connecté !`
  );

  console.log(
    `🎁 Giveaway V10 actif sur ${client.guilds.cache.size} serveur(s).`
  );

  client.user.setPresence({
    activities: [
      {
        name: "-giveaway • ApresMinuit",
        type: 0,
      },
    ],
    status: "online",
  });
});

// =====================================================
// ERREURS
// =====================================================

client.on("error", (error) => {
  console.error(
    "❌ Discord client error :",
    error
  );
});

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "❌ Unhandled rejection :",
      error
    );
  }
);

// =====================================================
// LOGIN
// =====================================================

if (!process.env.TOKEN) {
  console.error(
    "❌ TOKEN manquant. Ajoute TOKEN dans Railway."
  );

  process.exit(1);
}

client.login(
  process.env.TOKEN
);

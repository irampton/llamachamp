// settings.js

const fs = require('fs');
const path = require('path');

// Define the default values
const defaultSettings = {
    randomResponseOn: true,
    defaultTokens: 1024,
    responseRate: 1 / 175,
    qResponseRate: 1 / 8,
    personality: "default",
};

// The path where the settings will be stored
const settingsFilePath = path.join(__dirname, 'settings.json');

// Helper function to save the settings to a file
const saveSettings = (settings) => {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
};

// Helper function to load the settings from a file
const loadSettings = () => {
    if (fs.existsSync(settingsFilePath)) {
        const fileData = fs.readFileSync(settingsFilePath, 'utf-8');
        return JSON.parse(fileData);
    } else {
        return defaultSettings;
    }
};

// The SETTINGS object with getters and setters
const SETTINGS = (() => {
    let settings = loadSettings();

    return {
        get randomResponseOn() {
            return settings.randomResponseOn;
        },
        set randomResponseOn(value) {
            settings.randomResponseOn = value;
            saveSettings(settings);
        },

        get defaultTokens() {
            return settings.defaultTokens;
        },
        set defaultTokens(value) {
            settings.defaultTokens = value;
            saveSettings(settings);
        },

        get responseRate() {
            return settings.responseRate;
        },
        set responseRate(value) {
            settings.responseRate = value;
            saveSettings(settings);
        },

        get qResponseRate() {
            return settings.qResponseRate;
        },
        set qResponseRate(value) {
            settings.qResponseRate = value;
            saveSettings(settings);
        },

        get personality() {
            return settings.personality;
        },
        set personality(value) {
            settings.personality = value;
            saveSettings(settings);
        }
    };
})();

// Export the SETTINGS object
module.exports = {SETTINGS};
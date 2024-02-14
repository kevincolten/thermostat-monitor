const { parse, unparse } = require('papaparse');
const { writeFileSync } = require('fs');
const { DateTime } = require('luxon');
const { execSync } = require('child_process');
const {
  GOOGLE_API_REFRESH_TOKEN,
  GOOGLE_DEVICE_PROJECT_ID,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
} = process.env;

(async () => {
  const oldDataResponse = await (await fetch('https://kevincolten.github.io/thermostat-monitor/data.csv')).text();
  const { data } = parse(oldDataResponse, {
    header: true,
    delimiter: ','
  });

  const { access_token } = await (await fetch(`https://www.googleapis.com/oauth2/v4/token?client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_API_REFRESH_TOKEN}&grant_type=refresh_token`, {
    method: 'POST',
  })).json();

  const { devices } = await (await fetch(`https://smartdevicemanagement.googleapis.com/v1/enterprises/${GOOGLE_DEVICE_PROJECT_ID}/devices/`, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
  })).json();

  const newData = devices.map(device => ({
    location: ['Lockers', 'Theater'].includes(device.parentRelations?.[0]?.displayName) ? 'West 5th' : 'East Austin',
    name: device.parentRelations?.[0]?.displayName || '',
    humidity: device.traits?.['sdm.devices.traits.Humidity']?.ambientHumidityPercent || '',
    temperature: device.traits?.['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius || '',
    timestamp: DateTime.local().setZone("America/Chicago").toISO(),
    connectivity: device.traits?.['sdm.devices.traits.Connectivity']?.status || '',
    fan_timer: device.traits?.['sdm.devices.traits.Fan']?.timerMode || '',
    fan_timer_duration: device.traits?.['sdm.devices.traits.Fan']?.timerTimeout || '',
    mode: device.traits?.['sdm.devices.traits.ThermostatMode']?.mode || '',
    eco: device.traits?.['sdm.devices.traits.ThermostatEco']?.mode || '',
    status: device.traits?.['sdm.devices.traits.ThermostatHvac']?.status || '',
    coolSet: Math.round(device.traits?.['sdm.devices.traits.ThermostatTemperatureSetpoint']?.coolCelsius * 1.8 + 32) || '',
    heatSet: Math.round(device.traits?.['sdm.devices.traits.ThermostatTemperatureSetpoint']?.heatCelsius * 1.8 + 32) || '',
    temperature: Math.round(device.traits?.['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius * 1.8 + 32) || '',
  }));

  writeFileSync('./data/data.csv', unparse([...data, ...newData]), 'utf-8');

  execSync(`git config --local user.email "action@github.com" && git config --local user.name "GitHub Action" && npx gh-pages --repo https://git:${process.env.GH_API_KEY}@github.com/kevincolten/thermostat-monitor.git --dist data`);
})();
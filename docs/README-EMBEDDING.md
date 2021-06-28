# Embedding the Zea Svelte App in your own Web App

## Embed View

The Embed view shows how the svelte app would be displayed within the context of another application, embedded as an iFrame. The host application can then control the embedded svelte app via the JSON API and the Channel Messenger classes.

# Getting Started

To test zea-svelte-template embedded on your system, and run through the following steps.

In the root of the project, run the svelete app as normal using dev.

```sh
> npm run dev
```

With the Svelte app being server, run a static http server, in the docs directory of the project.
You may need to install a static server on your system. The http-server npm package is a good basic server.

```sh
> npm install --global http-server
```

```sh
> http-server

Starting up http-server, serving ./
Available on:
  http://192.168.2.25:8080
  http://127.0.0.1:8080
Hit CTRL-C to stop the server
```

Then open a browser at the given address.

> http://192.168.2.25:8080/embed.html

# Embedders Guide

Provided is a sample embed.html file that demonstrates how to embed Web Composer into a host application.

```javascript
<iframe id="zea-svelte-template" src="./zea-svelte-template/index.html?noframe"></iframe>

<script type="module">
  const viewer = document.getElementById('zea-svelte-template')
  import { ChannelMessenger } from './ChannelMessenger.js'

  const client = new ChannelMessenger(viewer)
  client.on('ready', (data) => {  })
</script>
```

The web app is intended to be deployed on a client companies infrastructure. This means the Web Composer web application is hosted on the same origin as the data being loaded ensuring that browser security policies are followed.

## Commands

The ChannelMessenger enables a host application to setn arbitrary commands to the embed window and recieve data in response.

### events vs send & get commands

Commands fall into 3 categories, 'event', 'send' and 'get'.

#### Events

Events are recieve data from the embed page and are used to push data from the embed to the host. This could include telling the host that the used has clicked on a specific geometry.

To implement an event, when the event must be related to the host, simply send the event over the channel messenger.

##### In the Svelte App code

```javascript
  // After 20 seconds, we tell the user something..
  setTimout(() => {
    client.send('gameOver', { info: ... })
  }, 20000)
```

##### In the Host App code

In your host application, you listen for this event using the channel messenger. You can then handle the event how you wish.

```javascript
client.on('somethingChanged', (data) => {
  console.log('selectionChanged:', data)
})
```

Within the Svelte app code, you can add support for your own commands by adding handlers for various command names.

#### Send Commamds

Used to send a command from the host page to the embed page, but a response is not expected.

##### In the Svelte App code

So implement a 'send' command, simply add code to the Svelte app that listens for your specific message, and implement some logic.

```javascript
  client.on('changeSomething', (data) => {
    // The host wants us to change something. Lets do it.
    ....
    // Return a simple 'done' value to let the host know that it completed.
    if (data._id) {
      client.send(data._id, { done: true })
    }
  })
```

##### In the Host App code

Then in your host application, you can now invoke the command using the channel messenger.

```javascript
client.do('changeSomething', { arg: 'Important Info' })
```

The Svelte app will recieve the message and apply the requested changes.

#### Get Commamds

Get comamnds are used to request data from the embed page. These commands involve the host app sending a command to the Svelte app, which processes the commands, and responds with data that the host app is waiting for.

_The return \_id is used to ensure that for a given message, the return value is passed back into the response callback._
get; commands should be responded to using the \_id provided in the data package received with the get message.

##### In the Svelte App code

In the svelte app implement a method that can be used to respond to the get command.

```javascript
client.on('getCustomData', (data) => {
  // The host wants some data from the svelte app. Lets do it.
  ....

  if (data._id) {
    const customData = ...
    client.send(data._id, { customData })
  }
})
```

##### In the Host App code

Then in your host application, you can now invoke the command using the channel messenger, and the Promise will resolve to the data provided by the Svelte app.

```javascript
client.do('getCustomData', {}).then((data) => {
  // The data object will include the custom data from the Svelte app.
  console.log('CustomData', data)
})
```

# JSON API

The Svelte app accepts a range of commands sent via the ChannelMessenger interface. These commands represent a sample set of commands for you to check out and use to base your own commands.

## Events

The Svelte App might emit events based on interactions within the viewer or other reasons. The host web application can listen to these events and respond.

#### Ready

The ready event is sent as soon as the zea-svelte-template frame has loaded, and the ChannelMessenger has established a connection with the page.

```javascript
client.on('ready', (data) => {
  console.log('zea-svelte-template is ready to load data')
})
```

#### selectionChanged

The selectionChanged event is sent when the selection changes in the selection manager in the app.

```javascript
client.on('selectionChanged', (data) => {
  console.log('selectionChanged:', data)
})
```

## Commands

The commands are structured in the following way.

> Command Name: The command name is a string describing which command should be invoked in the viewer.

> Payload: The payload is a json structure containing relevant information needed to process the command.

> Results: Each command returns a promise that resolves to some result returned by the zea-svelte-template

```javascript
do('command-name', payload).then((results) => {
  // process or display the results.
})
```

#### Load Project

```javascript
client
  .do('loadCADFile', {
    url: '../foo.zcad',
  })
  .then((data) => {
    console.log('loadCADFile Loaded', data)
  })
```

##### Payload:

zcad: the URL of the zcad accessible to the app.

##### Results:

The command returns a JavaScript object containing high level data about the loaded project.

#### Set Background Color

Sets the background color of the viewport.

> Note: this command is given to provide an example of how the viewer can be controlled. Other commands might be more relevant, and we are looking for this feedback.

```javascript
client.do('setBackgroundColor', { color: '#FF0000' })
```

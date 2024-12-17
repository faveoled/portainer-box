const Soup = imports.gi.Soup;


function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}


function tryListen(server, portNum) {
  try {
      let result = server.listen_local(portNum, Soup.ServerListenOptions.IPV4_ONLY);
      return result;
  } catch (error) {
      log("Port is bound: " + portNum)
      return false;
  }
}

function getRandomPorts() {
  let server = new Soup.Server();
  let ports = []
  let portNum = getRandomInt(10000, 50000);
  for (let i = 0; i <= 30; i++) {
      if (i == 30) {
          throw new Error("Failed to find a port to bind")
      }
      if (ports.length == 3) {
          break;
      }
      let doesListen = tryListen(server, portNum);
      if (doesListen) {
          ports.push(portNum);
      }
      portNum++;
  
  }
  server.disconnect();
  return ports;    
}

if (!this.module) this.module = {}
module.exports = {
    getRandomPorts
}

/**!
 * PolyParser.js - Parser for Poly Bridge 2 .layout and .slot files
 * Adapted for browser support.
 *
 * Copyright (c) 2024 ashduino101. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall
 * be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

const MAX_LAYOUT_VERSION = 28;
const MAX_BRIDGE_VERSION = 11;
const MAX_SLOT_VERSION = 3;
const MAX_PHYSICS_VERSION = 1;


function cSharpify(key) {
  // format the key unless it's 1 character (e.g. "x", "y", "z")
  return key.length > 1 ? "m_" + key.charAt(0).toUpperCase() + key.slice(1) : key;
}

// Adapted from https://stackoverflow.com/questions/19752516/renaming-object-keys-recursively
function cSharpifyKeys(o) {
  let build, key, destKey, value;

  // Only handle non-null objects
  if (o === null || typeof o !== "object") {
    return o;
  }

  // Handle array just by handling their contents
  if (Array.isArray(o)) {
    return o.map(cSharpifyKeys);
  }

  build = {};
  for (key in o) {
    // Get the destination key
    destKey = cSharpify(key);

    // Get the value
    value = o[key];

    // If this is an object, recurse
    if (typeof value === "object") {
      value = cSharpifyKeys(value);
    }

    // Set it on the result using the destination key
    build[destKey] = value;
  }
  return build;
}

function unCSharpify(key) {
  // remove the m_ prefix if the key is longer than 1 character, and shitf it all to lowercase
  let newStr = key.length > 1 ? key.slice(2) : key;
  return newStr.charAt(0).toLowerCase() + newStr.slice(1);
}

function unCSharpifyKeys(o) {
  let build, key, destKey, value;

  // Only handle non-null objects
  if (o === null || typeof o !== "object") {
    return o;
  }

  // Handle array just by handling their contents
  if (Array.isArray(o)) {
    return o.map(unCSharpifyKeys);
  }

  build = {};
  for (key in o) {
    // Get the destination key
    destKey = unCSharpify(key);

    // Get the value
    value = o[key];

    // If this is an object, recurse
    if (typeof value === "object") {
      value = unCSharpifyKeys(value);
    }

    // Set it on the result using the destination key
    build[destKey] = value;
  }
  return build;
}

function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class Deserializer {
  constructor(data) {
    /**
     * Initializes a new Deserializer.
     *
     * data: Uint8Array - The data to deserialize.
     */
    this.data = data;
    this.offset = 0;
    this.warnings = [];
    // Make sure objects exist for things that need them (and not arrays, strings, etc. which we can create on the fly)
    this.layout = {
      bridge: {
        version: MAX_BRIDGE_VERSION,
        anchors: [],
        joints: [],
        edges: [],
        pistons: [],
        phases: [],
        springs: []
      },
      budget: {},
      settings: {},
      workshop: {},
      modData: {},
    }
  }
  readByte() {
    const byte = this.data[this.offset];
    this.offset++;
    return byte;
  }
  readBytes(count) {
    const bytes = this.data.slice(this.offset, this.offset + count);
    this.offset += count;
    return bytes;
  }
  readBool() {
    return this.readByte() !== 0;
  }
  readInt16() {
    const value = this.readBytes(2);
    return new Uint16Array(value)[0];
  }
  readInt32() {
    const value = this.readBytes(4);
    let buf = new ArrayBuffer(4);
    let view = new DataView(buf);

    for (let i = 0; i < 4; i++) {
      view.setUint8(i, value[3 - i]);
    }

    return view.getInt32(0)
  }
  readFloat() {
    // This is a bit of a weird IEEE 754 float implementation, but it works
    let buf = new ArrayBuffer(4);
    let view = new DataView(buf);
    let bytes = this.readBytes(4);
    // reverse the bytes
    for (let i = 0; i < 4; i++) {
      view.setUint8(i, bytes[3 - i]);
    }
    return view.getFloat32(0);
  }
  readString() {
    const length = this.readInt16();
    const value = this.readBytes(length);
    return new TextDecoder().decode(value);
  }
  readByteArray() {
    const length = this.readInt32();
    return this.readBytes(length);
  }
  readVec3() {
    const x = this.readFloat();
    const y = this.readFloat();
    const z = this.readFloat();
    return {
      'x': x,
      'y': y,
      'z': z
    };
  }
  readVec2() {
    const x = this.readFloat();
    const y = this.readFloat();
    return {
      'x': x,
      'y': y
    };
  }
  readColor() {
    const r = this.readByte();
    const g = this.readByte();
    const b = this.readByte();
    return {
      'r': r / 255,
      'g': g / 255,
      'b': b / 255,
      'a': 1.0
    };
  }
  readQuaternion() {
    const x = this.readFloat();
    const y = this.readFloat();
    const z = this.readFloat();
    const w = this.readFloat();
    return {
      'x': x,
      'y': y,
      'z': z,
      'w': w
    };
  }

  static clamp01(value) {
    if (value < 0.0) {
      return 0.0;
    } else if (value > 1.0) {
      return 1.0;
    } else {
      return value;
    }
  }
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }
  static fixPistonNormalizedValue(value) {
    let out;
    if (value < 0.25) {
      out = Deserializer.lerp(1.0, 0.5, Deserializer.clamp01(value / 0.25));
      return out;
    }
    if (value > 0.75) {
      out = Deserializer.lerp(0.5, 1.0, Deserializer.clamp01((value - 0.75) / 0.25));
      return out;
    }
    out = Deserializer.lerp(0.0, 0.5, Deserializer.clamp01(Math.abs(value - 0.5) / 0.25));
    return out;
  }

  deserializeBridge() {
    // Version
    let bridge_version = this.readInt32();
    if (bridge_version > MAX_BRIDGE_VERSION) {
      this.warnings.push(`Bridge version ${bridge_version} is newer than the latest supported version ${MAX_BRIDGE_VERSION}.`);
    }
    this.layout.bridge.version = bridge_version;

    // if the bridge version is less than 2, then we don't have any bridge data
    if (bridge_version < 2) {
      return;
    }

    // Joints
    let count = this.readInt32();
    this.layout.bridge.joints = [];
    for (let i = 0; i < count; i++) {
      let joint = {};
      joint.pos = this.readVec3();
      joint.isAnchor = this.readBool();
      joint.isSplit = this.readBool();
      joint.guid = this.readString();
      if (this.layout.bridge.version >= 13) {
        joint.noBuild = this.readBool();
      }
      this.layout.bridge.joints.push(joint);
    }

    // Edges
    count = this.readInt32();
    this.layout.bridge.edges = [];
    for (let i = 0; i < count; i++) {
      let edge = {};
      edge.materialType = this.readInt32();
      edge.nodeAGuid = this.readString();
      edge.nodeBGuid = this.readString();
      edge.jointAPart = this.readInt32();
      edge.jointBPart = this.readInt32();
      if (bridge_version >= 12) {
        edge.bridgePrebuiltState = this.readInt32();
      }
      if (bridge_version >= 11) {
        edge.guid = this.readString();
      }
      this.layout.bridge.edges.push(edge);
    }

    // Springs
    this.layout.bridge.springs = [];
    if (bridge_version >= 7) {
      count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let spring = {};
        spring.normalizedValue = this.readFloat();
        spring.nodeAGuid = this.readString();
        spring.nodeBGuid = this.readString();
        spring.guid = this.readString();
        this.layout.bridge.springs.push(spring);
      }
    }

    // Pistons
    this.layout.bridge.pistons = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let piston = {};
      piston.normalizedValue = this.readFloat();
      piston.nodeAGuid = this.readString();
      piston.nodeBGuid = this.readString();
      piston.guid = this.readString();

      if (this.layout.version < 8) {
        // Fix the normalized value for the piston if the bridge version is less than 8
        piston.normalizedValue = Deserializer.fixPistonNormalizedValue(piston.normalizedValue);
      }
      this.layout.bridge.pistons.push(piston);
    }

    // Hydraulic phases
    this.layout.bridge.phases = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let phase = {};
      phase.hydraulicPhaseGuid = this.readString();

      let count2 = this.readInt32();
      phase.pistonGuids = [];
      for (let j = 0; j < count2; j++) {
        phase.pistonGuids.push(this.readString());
      }

      if (bridge_version > 2) {
        // Bridge split joints
        count2 = this.readInt32();
        phase.splitJoints = [];
        for (let j = 0; j < count2; j++) {
          let split_joint = {};
          split_joint.guid = this.readString();
          split_joint.state = this.readInt32();
          phase.splitJoints.push(split_joint);
        }
      } else {
        // garbage data
        count2 = this.readInt32();
        for (let j = 0; j < count2; j++) {
          this.readString();
        }
      }

      // Disable new additions
      if (bridge_version > 9) {
        phase.disableNewAdditions = this.readBool();
      }

      this.layout.bridge.phases.push(phase);
    }

    // Garbage data in v5
    if (bridge_version === 5) {
      count = this.readInt32();
      for (let i = 0; i < count; i++) {
        this.readString();
      }
    }

    // Anchors in v6+
    if (bridge_version >= 6) {
      count = this.readInt32();
      this.layout.bridge.anchors = [];
      for (let i = 0; i < count; i++) {
        let anchor = {};
        anchor.pos = this.readVec3();
        anchor.isAnchor = this.readBool();
        anchor.isSplit = this.readBool();
        anchor.guid = this.readString();
        if (bridge_version >= 13) {
          anchor.noBuild = this.readBool();
        }
        this.layout.bridge.anchors.push(anchor);
      }
    }

    // Random bool in v4-v8
    if (bridge_version >= 4 && bridge_version < 9) {
      this.readBool();
    }

    // Pillars
    if (bridge_version > 11) {
      count = this.readInt32();
      this.layout.bridge.pillars = [];
      for (let i = 0; i < count; i++) {
        let pillar = {};
        pillar.pos = this.readVec3();
        pillar.height = this.readFloat();
        pillar.prefabName = this.readString();
        pillar.guid = this.readString();
        pillar.anchorGuid = this.readString();
        if (bridge_version >= 12) {
          pillar.bridgePrebuiltState = this.readInt32();
        }
        this.layout.bridge.pillars.push(pillar);
      }
    }

    // Pillar anchors
    if (bridge_version > 11) {
      count = this.readInt32();
      this.layout.bridge.pillarAnchors = [];
      for (let i = 0; i < count; i++) {
        let anchor = {};
        anchor.pos = this.readVec3();
        anchor.isAnchor = this.readBool();
        anchor.isSplit = this.readBool();
        anchor.guid = this.readString();
        if (bridge_version >= 13) {
          anchor.noBuild = this.readBool();
        }
        this.layout.bridge.pillarAnchors.push(anchor);
      }
    }

    // Edge colors
    if (bridge_version >= 16) {
      count = this.readInt32();
      this.layout.bridge.edgeColors = [];
      for (let i = 0; i < count; i++) {
        let color = {};
        color.key = this.readString();
        color.value = this.readString();
        this.layout.bridge.edgeColors.push(color);
      }
    }
  }
  deserializeLayout() {
    // Version
    let version = this.readInt32();
    this.layout.isPTFModded = false;
    if (version < 0) {
      // Modded layout
      version = -version;
      this.layout.isModded = true;
    }
    this.layout.version = version;
    if (version > MAX_LAYOUT_VERSION) {
      this.warnings.push(`Layout version ${version} is newer than the latest supported version ${MAX_LAYOUT_VERSION}.`);
    }

    if (version >= 38) {
      this.layout.bridgeVersion = this.readInt32();
    } else {
      this.layout.bridgeVersion = 0;  // prevent new features from being improperly deserialized
    }

    // Stub key
    this.layout.themeStubKey = this.readString();

    this.layout.anchors = [];
    if (version >= 19) {
      // Anchors
      let count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let anchor = {};
        anchor.pos = this.readVec3();
        anchor.isAnchor = this.readBool();
        anchor.isSplit = this.readBool();
        anchor.guid = this.readString();
        if (this.layout.bridgeVersion >= 13) {
          anchor.noBuild = this.readBool();
        }
        this.layout.anchors.push(anchor);
      }
    }

    this.layout.phases = [];
    if (version >= 5) {
      // Hydraulic phases
      let count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let time_delay = this.readFloat();
        let guid = this.readString();
        this.layout.phases.push({
          'timeDelay': time_delay,
          'guid': guid
        });
      }
    }

    if (version > 4) {
      // Bridge
      this.deserializeBridge();
    } else {
      // Legacy format
      this.layout.bridge = {};
      // Joints
      let count = this.readInt32();
      this.layout.bridge.joints = [];
      for (let i = 0; i < count; i++) {
        let joint = {};
        joint.pos = this.readVec3();
        joint.isAnchor = this.readBool();
        joint.isSplit = this.readBool();
        joint.guid = this.readString();
        this.layout.bridge.joints.push(joint);
      }

      // Edges
      count = this.readInt32();
      this.layout.bridge.edges = [];
      for (let i = 0; i < count; i++) {
        let edge = {};
        edge.materialType = this.readInt32();
        edge.nodeAGuid = this.readString();
        edge.nodeBGuid = this.readString();
        edge.jointAPart = this.readInt32();
        edge.jointBPart = this.readInt32();
        this.layout.bridge.edges.push(edge);
      }

      // Pistons
      count = this.readInt32();
      this.layout.bridge.pistons = [];
      for (let i = 0; i < count; i++) {
        let piston = {};

        piston.normalizedValue = this.readFloat();
        piston.nodeAGuid = this.readString();
        piston.nodeBGuid = this.readString();
        piston.guid = this.readString();

        // since the version is definitely less than 8, we have to fix the normalized value
        piston.normalizedValue = Deserializer.fixPistonNormalizedValue(piston.normalizedValue);

        this.layout.bridge.pistons.push(piston);
      }
    }

    // Z-Axis Vehicles
    this.layout.zedAxisVehicles = [];
    if (version >= 7) {
      let count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let vehicle = {};
        vehicle.pos = this.readVec2();
        vehicle.prefabName = this.readString();
        vehicle.guid = this.readString();
        vehicle.timeDelay = this.readFloat();
        if (version >= 8) {
          vehicle.speed = this.readFloat();
        }
        if (version >= 26) {
          vehicle.rot = this.readQuaternion();
          vehicle.rotationDegrees = this.readFloat();
        }
        if (version >= 49) {
          vehicle.uniformScale = this.readFloat();
        }
        if (version >= 54) {
          vehicle.modId = this.readString();
          vehicle.snapToWaterLine = this.readBool();
        }
        if (version >= 57) {
          vehicle.reverse = this.readBool();
        }

        this.layout.zedAxisVehicles.push(vehicle);
      }
    }

    // Vehicles
    this.layout.vehicles = [];
    let count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let vehicle = {};
      vehicle.displayName = this.readString();
      vehicle.pos = this.readVec2();
      vehicle.rot = this.readQuaternion();
      vehicle.prefabName = this.readString();
      vehicle.targetSpeed = this.readFloat();
      vehicle.mass = this.readFloat();
      vehicle.brakingForceMultiplier = this.readFloat();
      vehicle.strengthMethod = this.readInt32();
      vehicle.acceleration = this.readFloat();
      vehicle.maxSlope = this.readFloat();
      vehicle.desiredAccleration = this.readFloat();
      vehicle.shocksMultiplier = this.readFloat();
      vehicle.rotationDegrees = this.readFloat();
      vehicle.timeDelay = this.readFloat();
      vehicle.idleOnDownhill = this.readBool();
      vehicle.flipped = this.readBool();
      vehicle.orderedCheckpoints = this.readBool();
      vehicle.guid = this.readString();

      if (version >= 50) {
        vehicle.uniformScale = this.readFloat();
      }
      if (version >= 51) {
        vehicle.skinId = this.readString();
      }
      if (version >= 54) {
        vehicle.modId = this.readString();
      }

      // Checkpoint GUIDs
      vehicle.checkpointGuids = [];
      let checkpointCount = this.readInt32();
      for (let j = 0; j < checkpointCount; j++) {
        vehicle.checkpointGuids.push(this.readString());
      }

      this.layout.vehicles.push(vehicle);
    }

    // Vehicle stop triggers
    this.layout.vehicleStopTriggers = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let trigger = {};
      trigger.pos = this.readVec2();
      trigger.rot = this.readQuaternion();
      trigger.height = this.readFloat();
      trigger.rotationDegrees = this.readFloat();
      trigger.flipped = this.readBool();
      if (version >= 73) {
        trigger.invisibleInSim = this.readBool();
      }
      trigger.prefabName = this.readString();
      trigger.stopVehicleGuid = this.readString();

      this.layout.vehicleStopTriggers.push(trigger);
    }

    // Theme objects before v20
    if (version < 20) {
      this.layout.themeObjectsObsolete = [];
      count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let themeObject = {};
        themeObject.pos = this.readVec2();
        themeObject.prefabName = this.readString();
        themeObject.unknownValue = this.readBool();
        this.layout.themeObjectsObsolete.push(themeObject);
      }
    }

    // Event timelines
    this.layout.eventTimelines = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let timeline = {};
      timeline.checkpointGuid = this.readString();

      let count2 = this.readInt32();
      timeline.stages = [];
      for (let j = 0; j < count2; j++) {
        let stage = {};

        let count3 = this.readInt32();
        stage.units = [];
        for (let k = 0; k < count3; k++) {
          let unit = {};

          if (version >= 7) {
            unit.guid = this.readString();
            stage.units.push(unit);
            continue;
          }

          // looks like somebody forgot to remove old serialization code
          let text = this.readString();
          if (text.length > 0) {
            unit.guid = text;
          }

          text = this.readString();
          if (text.length > 0) {
            unit.guid = text;
          }

          text = this.readString();
          if (text.length > 0) {
            unit.guid = text;
          }

          stage.units.push(unit);
        }

        timeline.stages.push(stage);
      }

      this.layout.eventTimelines.push(timeline);
    }

    // Checkpoints
    this.layout.checkpoints = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let checkpoint = {};
      checkpoint.pos = this.readVec2();
      checkpoint.prefabName = this.readString();
      checkpoint.vehicleGuid = this.readString();
      checkpoint.vehicleRestartPhaseGuid = this.readString();
      checkpoint.triggerTimeline = this.readBool();
      checkpoint.stopVehicle = this.readBool();
      checkpoint.reverseVehicleOnRestart = this.readBool();
      if (version >= 73) {
        checkpoint.invisibleInSim = this.readBool();
      }
      checkpoint.guid = this.readString();

      this.layout.checkpoints.push(checkpoint);
    }

    // Terrain stretches
    this.layout.terrainStretches = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let island = {};
      island.pos = this.readVec3();
      island.prefabName = this.readString();
      island.heightAdded = this.readFloat();
      island.rightEdgeWaterHeight = this.readFloat();
      island.terrainIslandType = this.readInt32();
      island.variantIndex = this.readInt32();
      island.flipped = this.readBool();
      if (version >= 6) {
        island.lockPosition = this.readBool();
      }
      if ((this.layout.version >= 27 && this.layout.version < 31) || this.layout.version >= 52) {
        island.hidden = this.readBool();
      }
      if (version >= 34) {
        island.height = this.readFloat();
      }

      this.layout.terrainStretches.push(island);
    }

    // Platforms
    this.layout.platforms = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let platform = {};
      platform.pos = this.readVec2();
      platform.width = this.readFloat();
      platform.height = this.readFloat();
      platform.flipped = this.readBool();
      if (version >= 22) {
        platform.solid = this.readBool();
      } else {
        // random int at end of earlier versions
        this.readInt32();
      }

      this.layout.platforms.push(platform);
    }

    // Ramps
    this.layout.ramps = []
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let ramp = {};
      ramp.pos = this.readVec2();

      // control points
      let count2 = this.readInt32();
      ramp.controlPoints = [];
      for (let j = 0; j < count2; j++) {
        ramp.controlPoints.push(this.readVec2());
      }

      ramp.height = Math.abs(this.readFloat());
      ramp.numSegments = this.readInt32();
      ramp.splineType = this.readInt32();
      ramp.flippedVertical = this.readBool();
      ramp.flippedHorizontal = this.readBool();
      ramp.hideLegs = (version >= 23 && this.readBool());

      if (version >= 25) {
        ramp.flippedLegs = this.readBool();
      } else if (version >= 22) {
        this.readBool();
      } else {
        this.readInt32();
      }

      ramp.linePoints = [];
      if (version >= 13) {
        count2 = this.readInt32();
        for (let j = 0; j < count2; j++) {
          ramp.linePoints.push(this.readVec2());
        }
      }

      this.layout.ramps.push(ramp);
    }

    // In versions below v5, we have hydraulic phases here
    if (version < 5) {
      let count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let time_delay = this.readFloat();
        let guid = this.readString();
        this.layout.phases.push({
          timeDelay: time_delay,
          'guid': guid
        });
      }
    }

    // Vehicle restart phases
    this.layout.vehicleRestartPhases = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let phase = {}
      phase.timeDelay = this.readFloat();
      phase.guid = this.readString();
      phase.vehicleGuid = this.readString();

      this.layout.vehicleRestartPhases.push(phase);
    }

    // Flying objects
    this.layout.flyingObjects = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let object = {};
      object.pos = this.readVec3();
      object.scale = this.readVec3();
      object.prefabName = this.readString();

      this.layout.flyingObjects.push(object);
    }

    // Rocks
    this.layout.rocks = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let rock = {};
      rock.pos = this.readVec3();
      rock.scale = this.readVec3();
      rock.prefabName = this.readString();
      rock.flipped = this.readBool();
      if (version >= 60) {
        rock.lockToBottom = this.readBool();
      }
      if (version >= 66) {
        rock.uniformScale = this.readBool();
      }

      this.layout.rocks.push(rock);
    }

    // Water blocks
    this.layout.waterBlocks = [];
    count = this.readInt32();
    for (let i = 0; i < count; i++) {
      let water = {};
      water.pos = this.readVec3();
      water.width = this.readFloat();
      water.height = this.readFloat();

      if (version >= 12) {
        water.lockPosition = this.readBool();
      }

      this.layout.waterBlocks.push(water);
    }

    // Garbage data in v5-
    if (version < 5) {
      count = this.readInt32();
      let count2;
      for (let i = 0; i < count; i++) {
        this.readString();
        count2 = this.readInt32();
        for (let j = 0; j < count2; j++) {
          this.readString();
        }
      }
    }

    // Budget
    this.layout.budget.cash = this.readInt32();
    this.layout.budget.road = this.readInt32();
    this.layout.budget.wood = this.readInt32();
    this.layout.budget.steel = this.readInt32();
    this.layout.budget.hydraulics = this.readInt32();
    this.layout.budget.rope = this.readInt32();
    this.layout.budget.cable = this.readInt32();
    this.layout.budget.spring = this.readInt32();
    this.layout.budget.bungeeRope = this.readInt32();
    if (version >= 30) {
      this.layout.budget.pillar = this.readInt32();
    }

    this.layout.budget.allowWood = this.readBool();
    this.layout.budget.allowSteel = this.readBool();
    this.layout.budget.allowHydraulics = this.readBool();
    this.layout.budget.allowRope = this.readBool();
    this.layout.budget.allowCable = this.readBool();
    this.layout.budget.allowSpring = this.readBool();
    if (version <= 28) {
      this.layout.budget.allowReinforcedRoad = this.readBool();
    }
    if (version >= 31) {
      this.layout.budget.allowPillar = this.readBool();
    }

    // Settings
    if (version >= 61) {
      this.layout.title = this.readString();
      this.layout.description = this.readString();
    }
    this.layout.settings.hydraulicsControllerEnabled = this.readBool();
    this.layout.settings.unbreakable = this.readBool();
    if (version >= 55) {
      this.layout.settings.unlimitedHeightFoundations = this.readBool();
    }
    this.layout.settings.noWater = (this.layout.version >= 28 && this.readBool());
    if (version >= 31) {
      this.layout.settings.noReinforcedRoad = this.readBool();
    }
    if (version >= 30) {
      this.layout.settings.springAdjustmentsAllowed = this.readBool();
    }
    if (version >= 36) {
      this.layout.settings.hideDecor = this.readBool();
    }
    if (version >= 46) {
      this.layout.settings.fogHeight = this.readFloat();
    }
    if (version >= 71) {
      this.layout.settings.fogHeightMinWorldY = this.readFloat();
      this.layout.settings.fogHeightMaxWorldY = this.readFloat();
      this.layout.settings.fogHeightEndRelativeY = this.readFloat();
    } else {
      if (version >= 68) {
        this.readFloat();
        this.readFloat();
      }
    }
    if (version >= 59) {
      this.layout.settings.multiSelectMovementIncrement = this.readFloat();
    }
    if (version >= 69) {
      this.layout.settings.thumbnailCameraSaved = this.readBool();
      this.layout.settings.thumbnailCameraPos = this.readVec3();
      this.layout.settings.thumbnailCameraRot = this.readQuaternion();
      this.layout.settings.thumbnailCameraOrthographicSize = this.readFloat();
    }

    // Custom shapes in v9+
    if (version > 9) {
      count = this.readInt32();
      this.layout.customShapes = [];
      for (let i = 0; i < count; i++) {
        let s = {};
        if (version >= 64) {
          s.version = this.readInt32();
        } else {
          s.version = 0;
        }
        s.pos = this.readVec3();
        s.rot = this.readQuaternion();
        s.scale = this.readVec3();
        if (version >= 72) {
          s.meshScale = this.readVec3();
        }
        s.flipped = this.readBool();
        if (version >= 74) {
          s.lowFriction = this.readBool();
        }
        if (version < 45) {
          s.dynamic = this.readBool();
        }
        s.collidesWithRoad = this.readBool();
        s.collidesWithNodes = this.readBool();
        if (version >= 53) {
          s.collidesWithRamps = this.readBool();
        }
        if (version >= 30 && (version < 34 || version >= 64)) {
          s.collidesWithVehicles = this.readBool();
        }
        if (version >= 25) {
          s.collidesWithSplitNodes = this.readBool()
        }
        s.rotationDegrees = this.readFloat();
        if (version >= 10) {
          s.color = this.readColor();
        } else {
          this.readInt32();
        }
        if (version >= 11) {
          s.mass = this.readFloat();
        } else {
          this.readFloat();
          s.mass = 40.0;
        }
        if (version >= 14) {
          s.bounciness = this.readFloat();
        } else {
          s.bounciness = 0.5;
        }
        if (version >= 24) {
          s.pinMotorStrength = this.readFloat();
          s.pinTargetVelocity = this.readFloat();
        } else {
          s.pinMotorStrength = 0.0;
          s.pinTargetVelocity = 0.0;
        }
        if (version >= 63) {
          s.pinTargetAcceleration = this.readFloat();
        }
        if (version >= 44) {
          s.thickness = this.readFloat();
        }
        if (version >= 41) {
          s.textureId = this.readString();
        }
        if (version >= 47) {
          s.meshId = this.readString();
          s.meshLocalPos = this.readVec3();
        }
        if (version >= 45) {
          s.textureTiling = this.readFloat();
          s.behaviour = this.readInt32();
        } else if (version >= 42) {
          s.textureTiling = this.readVec2().x;
        }

        // Points
        let count2 = this.readInt32();
        s.pointsLocalSpace = [];
        for (let j = 0; j < count2; j++) {
          s.pointsLocalSpace.push(this.readVec2());
        }

        // Static pins
        count2 = this.readInt32();
        s.staticPins = [];
        for (let j = 0; j < count2; j++) {
          s.staticPins.push(this.readVec3());
        }

        // Dynamic anchors
        count2 = this.readInt32();
        s.dynamicAnchorGuids = [];
        for (let j = 0; j < count2; j++) {
          s.dynamicAnchorGuids.push(this.readString());
          if (version >= 48) {
            s.dynamicAnchors = [];
            let count3 = this.readInt32();
            for (let k = 0; k < count3; k++) {
              s.dynamicAnchors.push(this.readVec3());
            }
          }
        }

        this.layout.customShapes.push(s);
      }
    }

    // Workshop in v15+
    if (version >= 15) {
      this.layout.workshop.id = this.readString();
      if (version >= 16 && version <= 38) {
        this.layout.workshop.leaderboardId = this.readString();
      }
      if (version < 61) {
        this.layout.title = this.readString();
        this.layout.description = this.readString();
      }
      this.layout.workshop.autoplay = this.readBool();
      if (version >= 67) {
        this.layout.workshop.allowFeatured = this.readBool();
      }
      if (version < 70) {
        count = this.readInt32();
        this.layout.workshop.tags = [];
        for (let i = 0; i < count; i++) {
          this.layout.workshop.tags.push(this.readString());
        }
      }
    }

    // Support pillars in v17-30
    if (version >= 17 && version <= 30) {
      count = this.readInt32();
      this.layout.supportPillars = [];
      for (let i = 0; i < count; i++) {
        let pillar = {};
        pillar.pos = this.readVec3();
        pillar.scale = this.readVec3();
        pillar.prefabName = this.readString();

        this.layout.supportPillars.push(pillar);
      }
    }

    // Pillars in v18+
    if (version >= 18) {
      count = this.readInt32();
      this.layout.pillars = [];
      for (let i = 0; i < count; i++) {
        let pillar = {};
        pillar.pos = this.readVec3();
        pillar.height = this.readFloat();
        pillar.prefabName = this.readString();

        this.layout.pillars.push(pillar);
      }
    }

    // Build zones in v32+
    if (version >= 32) {
      count = this.readInt32();
      this.layout.buildZones = [];
      for (let i = 0; i < count; i++) {
        let zone = {};
        zone.pos = this.readVec2();
        zone.size = this.readVec2();
        zone.lockPosition = this.readBool();
        if (version >= 43) {
          zone.rotationDegrees = this.readFloat();
        }
        if (version >= 62) {
          zone.type = this.readInt32();
        }
        if (zone.type === 1) {  // triangle
          if (version >= 62) {
            zone.vertices = [];
            let count2 = this.readInt32();
            for (let j = 0; j < count2; j++) {
              zone.vertices.push(this.readVec3());
            }
          }
        }
      }
    }

    // Train tracks (obsolete)
    if (version >= 33) {
      this.layout.trainTracks = [];
      count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let track = {};
        // i'm just guessing at these
        track.pos = this.readVec3();
        track.length = this.readFloat();
        track.guid = this.readString();
        this.layout.trainTracks.push(track);
      }
    }

    if (this.offset >= this.data.length) {
      return;  // idk probably some versioning issue
    }

    // Decors
    if (version >= 35) {
      this.layout.decors = [];
      count = this.readInt32();
      for (let i = 0; i < count; i++) {
        let decor = {};
        decor.pos = this.readVec3();
        if (version >= 65) {
          decor.scale = this.readVec3();
        }
        decor.yaw = this.readFloat();
        if (version >= 58) {
          decor.pitch = this.readFloat();
          decor.roll = this.readFloat();
        }
        decor.id = this.readString();
        if (version >= 40) {
          decor.showInBuildMode = this.readBool();
        }
        if (version >= 66) {
          decor.uniformScale = this.readBool();
        }
        if (version >= 54) {
          decor.modId = this.readString();
        }
        this.layout.decors.push(decor);
      }
    }

    // PTF support --------
    if (!this.layout.isPTFModded) return;

    // Mod metadata
    count = this.readInt16();
    this.layout.modData.mods = [];
    for (let i = 0; i < count; i++) {
      let string = this.readString();
      let partsOfMod = string.split("\u058D");

      let name = !(partsOfMod.length === 0) ? partsOfMod[0] : "";
      let version = (partsOfMod.length >= 2) ? partsOfMod[1] : "";
      let settings = (partsOfMod.length >= 3) ? partsOfMod[2] : "";

      this.layout.modData.mods.push({
        'name': name,
        'version': version,
        'settings': settings.split('|')
      });
    }

    // Mod save data
    count = this.readInt32();
    if (count === 0) return;
    this.layout.modData.modSaveData = []
    for (let i = 0; i < count; i++) {
      let modIdentifier = this.readString();
      let partsOfMod = modIdentifier.split("\u058D");
      let name = !(partsOfMod.length === 0) ? partsOfMod[0] : "";
      // if there's no version, find the version in the mod metadata
      let version = !(partsOfMod.length >= 2) ? partsOfMod[1] : this.layout.modData.mods.find(mod => mod.name === name).version;

      if (name === "") {
        continue;
      }

      let saveData = this.readByteArray();
      // base64 encode the save data
      let base64 = btoa(String.fromCharCode.apply(null, saveData));

      this.layout.modData.modSaveData.push({
        'name': name,
        'version': version,
        'data': base64
      });
    }
  }

  dumpJSON(indent = 2) {
    // Dumps PolyConverter-compatible JSON.

    let layout = cSharpifyKeys(this.layout);

    // dump JSON
    return JSON.stringify(layout, null, indent);
  }
}


class Serializer {
  constructor(layout) {
    if (typeof layout === 'object') {
      this.layout = layout;
    } else if (typeof layout === 'string') {
      this.layout = this.fromJSON(layout);
    } else {
      this.layout = {
        anchors: [],
        phases: [],
        zedAxisVehicles: [],
        flyingObjects: [],
        rocks: [],
        ramps: [],
        customShapes: [],
        vehicles: [],
        vehicleStopTriggers: [],
        eventTimelines: [],
        checkpoints: [],
        platforms: [],
        vehicleRestartPhases: [],
        hydraulicPhases: [],
        bridge: {
          version: MAX_BRIDGE_VERSION,
          anchors: [],
          joints: [],
          edges: [],
          pistons: [],
          phases: [],
          springs: []
        },
        budget: {
          cash: 10000000,
          road: 100,
          wood: 100,
          steel: 100,
          hydraulics: 100,
          rope: 100,
          cable: 100,
          spring: 100,
          bungeeRope: 100,
          allowWood: true,
          allowSteel: true,
          allowHydraulics: true,
          allowRope: true,
          allowCable: true,
          allowSpring: true,
          allowReinforcedRoad: true,
        },
        settings: {
          hydraulicsControllerEnabled: false,
          unbreakable: false,
          noWater: true
        },
        workshop: {
          description: "",
          id: "",
          leaderboardId: "",
          title: "",
          autoplay: false,
          tags: []
        },
        pillars: [],
        supportPillars: [],
        themeStubKey: "Steampunk",
        modData: {},
        waterBlocks: [{
          pos: {
            x: 6,
            y: 1.5,
            z: 0
          },
          width: 12,
          height: 3,
          lockPosition: false
        }],
        terrainStretches: [
          {
            pos: {
              x: 0,
              y: 0,
              z: 0
            },
            prefabName: "Terrain_BookEndD",
            heightAdded: 0,
            rightEdgeWaterHeight: 3,
            terrainIslandType: 0,
            variantIndex: 3,
            flipped: false,
            lockPosition: false,
            hidden: true
          },
          {
            pos: {
              x: 12,
              y: 0,
              z: 0
            },
            prefabName: "Terrain_BookEndD",
            heightAdded: 0,
            rightEdgeWaterHeight: 1,
            terrainIslandType: 0,
            variantIndex: 3,
            flipped: true,
            lockPosition: false,
            hidden: true
          }
        ]
      }
    }
    this.offset = 0;

    // Generate an estimate of the byte size of the layout.
    // This is used to allocate a buffer for the serialized data.
    let size = this.estimateSize();
    console.log("Allocating " + size + " bytes for serialized data.");

    this.buffer = new Uint8Array(size);
  }

  estimateSize() {
    /**
     * Gets a value higher than the size of the layout for the buffer allocation.
     */
    let size = 0;
    // A lot of these will be more than the actual size, but that's just to be safe; it gets trimmed at the end anyway.
    // Mainly why we're doing this is because each GUID is 36 bytes, which, in the long run, is quite large.

    // Pre bridge ---------------------------------------------------------------------------------
    size += 4; // version
    size += 16; // more than enough for the stub key
    // 64 bytes per anchor
    size += this.layout.anchors.length * 64;
    // 64 bytes per hydraulic phase
    size += this.layout.phases.length * 64;

    // Bridge -------------------------------------------------------------------------------------
    size += 4; // version
    // 128 bytes per joint
    size += this.layout.bridge.joints.length * 128;
    // 128 bytes per edge
    size += this.layout.bridge.edges.length * 128;
    // 128 bytes per spring
    size += this.layout.bridge.springs.length * 128;
    // 128 bytes per piston
    size += this.layout.bridge.pistons.length * 128;
    // Hydraulic phases have some arrays, so let's check over them.
    // 36 bytes per phase GUID
    size += this.layout.bridge.phases.length * 36;
    // 36 bytes per piston GUID and up to 64 bytes per split joint
    for (let i = 0; i < this.layout.bridge.phases.length; i++) {
      size += this.layout.bridge.phases[i].pistonGuids.length * 36;
      size += this.layout.bridge.phases[i].splitJoints.length * 64;
    }
    // 1 byte boolean for disableNewAdditions
    size += this.layout.bridge.phases.length;
    // 64 bytes per anchor
    size += this.layout.bridge.anchors.length * 64;

    // Post bridge ---------------------------------------------------------------------------------
    // 96 bytes per Z-axis vehicle
    size += this.layout.zedAxisVehicles.length * 96;
    // 256 bytes per vehicle, excluding checkpoint GUIDs
    size += this.layout.vehicles.length * 256;
    // 36 bytes per checkpoint GUID
    for (let i = 0; i < this.layout.vehicles.length; i++) {
      size += this.layout.vehicles[i].checkpointGuids.length * 36;
    }
    // 96 bytes per vehicle stop trigger
    size += this.layout.vehicleStopTriggers.length * 96;
    // We're just going to assume nobody will use over 1 kB of data per timelines
    size += this.layout.eventTimelines.length * 1024;
    // 192 bytes per checkpoint
    size += this.layout.checkpoints.length * 192;
    // 64 or so bytes per terrain stretch
    size += this.layout.terrainStretches.length * 64;
    // 24 bytes per platform
    size += this.layout.platforms.length * 24;
    // We'll just assume no more than 1 kB per ramp
    size += this.layout.ramps.length * 1024;
    // 96 per vehicle restart phase
    size += this.layout.vehicleRestartPhases.length * 96;
    // 48 bytes per flying object
    size += this.layout.flyingObjects.length * 48;
    // 48 bytes per rock
    size += this.layout.rocks.length * 48;
    // 24 bytes per water block
    size += this.layout.waterBlocks.length * 24;
    // 64 bytes for budget
    size += 64;
    // 4 bytes for settings
    size += 4;
    // 84 bytes for 1st-dimension custom shape params to be safe
    size += this.layout.customShapes.length * 84;
    // Points, pins, and anchors
    for (let i = 0; i < this.layout.customShapes.length; i++) {
      // 8 bytes per point
      size += this.layout.customShapes[i].pointsLocalSpace.length * 8;
      // 12 bytes per static pin
      size += this.layout.customShapes[i].staticPins.length * 12;
      // 36 bytes per dynamic anchor GUID
      size += this.layout.customShapes[i].dynamicAnchorGuids.length * 36;
    }
    // 8 bytes for workshop ID, another for leaderboard ID, 64 for title, figure out description, 16 bytes per tag
    size += 80;
    size += this.layout.workshop.description.length;
    size += this.layout.workshop.tags.length * 16;
    // 48 bytes per support pillar
    size += this.layout.supportPillars.length * 48;
    // 32 bytes per pillar
    size += this.layout.pillars.length * 32;

    return size;

  }

  writeByte(value) {
    this.buffer[this.offset++] = value;
  }
  writeBytes(value, count) {
    for (let i = 0; i < count; i++) {
      this.writeByte(value[i]);
    }
  }
  writeBool(value) {
    this.writeByte(value ? 1 : 0);
  }
  writeInt16(value) {
    this.writeBytes(new Uint8Array(Int16Array.from([value]).buffer), 2);
  }
  writeInt32(value) {
    this.writeBytes(new Uint8Array(Int32Array.from([value]).buffer), 4);
  }
  writeFloat(value) {
    this.writeBytes(new Uint8Array(Float32Array.from([value]).buffer), 4);
  }
  writeString(value) {
    this.writeInt16(value.length);
    this.writeBytes(new Uint8Array(new TextEncoder().encode(value)), value.length);
  }
  writeByteArray(value) {
    this.writeInt32(value.length);
    this.writeBytes(value, value.length);
  }
  writeVec3(value) {
    this.writeFloat(value.x);
    this.writeFloat(value.y);
    this.writeFloat(value.z);
  }
  writeVec2(value) {
    this.writeFloat(value.x);
    this.writeFloat(value.y);
  }
  writeColor(value) {
    this.writeByte(value.r * 255);
    this.writeByte(value.g * 255);
    this.writeByte(value.b * 255);
  }
  writeQuaternion(value) {
    this.writeFloat(value.x);
    this.writeFloat(value.y);
    this.writeFloat(value.z);
    this.writeFloat(value.w);
  }

  findVehicleByGuid(guid) {
    for (let i = 0; i < this.layout.vehicles.length; i++) {
      if (this.layout.vehicles[i].guid === guid) {
        return this.layout.vehicles[i];
      }
    }
    return null;
  }

  serializeAnchorsBinary() {
    this.writeInt32(this.layout.anchors.length);
    for (let i = 0; i < this.layout.anchors.length; i++) {
      let anchor = this.layout.anchors[i];
      this.writeVec3(anchor.pos);
      this.writeBool(anchor.isAnchor);
      this.writeBool(anchor.isSplit);
      this.writeString(anchor.guid);
    }
  }
  serializeHydraulicPhasesBinary() {
    this.writeInt32(this.layout.phases.length);
    for (let i = 0; i < this.layout.phases.length; i++) {
      let phase = this.layout.phases[i];
      this.writeFloat(phase.timeDelay);
      this.writeString(phase.guid);
    }
  }
  serializePreBridgeBinary() {
    // Version
    // if the layout is modded, the version will be negative
    let version = MAX_LAYOUT_VERSION;
    if (this.layout.isModded) {
      version *= -1;
    }
    this.writeInt32(version);
    this.writeString(this.layout.themeStubKey);
    this.serializeAnchorsBinary();
    this.serializeHydraulicPhasesBinary();
  }
  serializeBridgeBinary(bridgeOnly) {
    let b = this.layout.bridge;
    this.writeInt32(MAX_BRIDGE_VERSION);
    // Joints
    this.writeInt32(b.joints.length);
    for (let i = 0; i < b.joints.length; i++) {
      let j = b.joints[i];
      this.writeVec3(j.pos);
      this.writeBool(j.isAnchor);
      this.writeBool(j.isSplit);
      this.writeString(j.guid);
    }
    // Edges
    this.writeInt32(b.edges.length);
    for (let i = 0; i < b.edges.length; i++) {
      let e = b.edges[i];
      this.writeInt32(e.materialType);
      this.writeString(e.nodeAGuid);
      this.writeString(e.nodeBGuid);
      this.writeInt32(e.jointAPart);
      this.writeInt32(e.jointBPart);
      this.writeString(e.guid ? e.guid : createUUID());
    }
    // Springs
    this.writeInt32(b.springs.length);
    for (let i = 0; i < b.springs.length; i++) {
      let s = b.springs[i];
      this.writeFloat(s.normalizedValue);
      this.writeString(s.nodeAGuid);
      this.writeString(s.nodeBGuid);
      this.writeString(s.guid);
    }
    // Pistons
    this.writeInt32(b.pistons.length);
    for (let i = 0; i < b.pistons.length; i++) {
      let p = b.pistons[i];
      this.writeFloat(p.normalizedValue);
      this.writeString(p.nodeAGuid);
      this.writeString(p.nodeBGuid);
      this.writeString(p.guid);
    }
    // Phases
    this.writeInt32(b.phases.length);
    for (let i = 0; i < b.phases.length; i++) {
      let p = b.phases[i];
      this.writeString(p.hydraulicPhaseGuid);

      this.writeInt32(p.pistonGuids.length);
      for (let j = 0; j < p.pistonGuids.length; j++) {
        this.writeString(p.pistonGuids[j]);
      }

      this.writeInt32(p.splitJoints.length);
      for (let j = 0; j < p.splitJoints.length; j++) {
        let sj = p.splitJoints[j];
        this.writeString(sj.guid);
        this.writeInt32(sj.state);
      }

      this.writeBool(p.disableNewAdditions);
    }
    // Anchors
    this.writeInt32(b.anchors.length);
    for (let i = 0; i < b.anchors.length; i++) {
      let a = b.anchors[i];
      this.writeVec3(a.pos);
      this.writeBool(a.isAnchor);
      this.writeBool(a.isSplit);
      this.writeString(a.guid);
    }

    // Trim the buffer if only the bridge is deserialized
    if (bridgeOnly) {
      this.buffer = this.buffer.slice(0, this.offset);
    }
  }
  serializePostBridgeBinary() {
    // Z Axis Vehicles
    this.writeInt32(this.layout.zedAxisVehicles.length);
    for (let i = 0; i < this.layout.zedAxisVehicles.length; i++) {
      let v = this.layout.zedAxisVehicles[i];
      this.writeVec2(v.pos);
      this.writeString(v.prefabName);
      this.writeString(v.guid);
      this.writeFloat(v.timeDelay);
      this.writeFloat(v.speed);
      this.writeQuaternion(v.rot);
      this.writeFloat(v.rotationDegrees);
    }

    // Vehicles
    this.writeInt32(this.layout.vehicles.length);
    for (let i = 0; i < this.layout.vehicles.length; i++) {
      let v = this.layout.vehicles[i];
      this.writeString(v.displayName);
      this.writeVec2(v.pos);
      this.writeQuaternion(v.rot);
      this.writeString(v.prefabName);
      this.writeFloat(v.targetSpeed);
      this.writeFloat(v.mass);
      this.writeFloat(v.brakingForceMultiplier);
      this.writeInt32(v.strengthMethod);
      this.writeFloat(v.acceleration);
      this.writeFloat(v.maxSlope);
      this.writeFloat(v.desiredAccleration);
      this.writeFloat(v.shocksMultiplier);
      this.writeFloat(v.rotationDegrees);
      this.writeFloat(v.timeDelay);
      this.writeBool(v.idleOnDownhill);
      this.writeBool(v.flipped);
      this.writeBool(v.orderedCheckpoints);
      this.writeString(v.guid);

      this.writeInt32(v.checkpointGuids.length);
      for (let j = 0; j < v.checkpointGuids.length; j++) {
        this.writeString(v.checkpointGuids[j]);
      }
    }

    // Vehicle stop triggers
    this.writeInt32(this.layout.vehicleStopTriggers.length);
    for (let i = 0; i < this.layout.vehicleStopTriggers.length; i++) {
      let t = this.layout.vehicleStopTriggers[i];
      this.writeVec2(t.pos);
      this.writeQuaternion(t.rot);
      this.writeFloat(t.height);
      this.writeFloat(t.rotationDegrees);
      this.writeBool(t.flipped);
      this.writeString(t.prefabName);
      this.writeString(t.stopVehicleGuid);
    }

    // Timelines
    this.writeInt32(this.layout.eventTimelines.length);
    for (let i = 0; i < this.layout.eventTimelines.length; i++) {
      let t = this.layout.eventTimelines[i];
      this.writeString(t.checkpointGuid);

      this.writeInt32(t.stages.length);
      for (let j = 0; j < t.stages.length; j++) {
        let s = t.stages[j];
        this.writeInt32(s.units.length);
        for (let k = 0; k < s.units.length; k++) {
          let u = s.units[k];
          this.writeString(u.guid);
        }
      }
    }

    // Checkpoints
    this.writeInt32(this.layout.checkpoints.length);
    for (let i = 0; i < this.layout.checkpoints.length; i++) {
      let c = this.layout.checkpoints[i];
      this.writeVec2(c.pos);
      this.writeString(c.prefabName);
      this.writeString(c.vehicleGuid);
      this.writeString(c.vehicleRestartPhaseGuid);
      this.writeBool(c.triggerTimeline);
      this.writeBool(c.stopVehicle);
      this.writeBool(c.reverseVehicleOnRestart);
      this.writeString(c.guid);
    }

    // Terrain stretches
    this.writeInt32(this.layout.terrainStretches.length);
    for (let i = 0; i < this.layout.terrainStretches.length; i++) {
      let s = this.layout.terrainStretches[i];
      this.writeVec3(s.pos);
      this.writeString(s.prefabName);
      this.writeFloat(s.heightAdded);
      this.writeFloat(s.rightEdgeWaterHeight);
      this.writeInt32(s.terrainIslandType);
      this.writeInt32(s.variantIndex);
      this.writeBool(s.flipped);
      this.writeBool(s.lockPosition);
      this.writeBool(s.hidden);
    }

    // Platforms
    this.writeInt32(this.layout.platforms.length);
    for (let i = 0; i < this.layout.platforms.length; i++) {
      let p = this.layout.platforms[i];
      this.writeVec2(p.pos);
      this.writeFloat(p.width);
      this.writeFloat(p.height);
      this.writeBool(p.flipped);
      this.writeBool(p.solid);
    }

    // Ramps
    this.writeInt32(this.layout.ramps.length);
    for (let i = 0; i < this.layout.ramps.length; i++) {
      let r = this.layout.ramps[i];
      this.writeVec2(r.pos);

      this.writeInt32(r.controlPoints.length);
      for (let j = 0; j < r.controlPoints.length; j++) {
        this.writeVec2(r.controlPoints[j]);
      }

      this.writeFloat(r.height);
      this.writeInt32(r.numSegments);
      this.writeInt32(r.splineType);
      this.writeBool(r.flippedVertical);
      this.writeBool(r.flippedHorizontal);
      this.writeBool(r.hideLegs);
      this.writeBool(r.flippedLegs);

      this.writeInt32(r.linePoints.length);
      for (let j = 0; j < r.linePoints.length; j++) {
        this.writeVec2(r.linePoints[j]);
      }
    }

    // Vehicle restart phases
    this.writeInt32(this.layout.vehicleRestartPhases.length);
    for (let i = 0; i < this.layout.vehicleRestartPhases.length; i++) {
      let p = this.layout.vehicleRestartPhases[i];
      this.writeFloat(p.timeDelay);
      this.writeString(p.guid);
      this.writeString(p.vehicleGuid);
    }

    // Flying objects
    this.writeInt32(this.layout.flyingObjects.length);
    for (let i = 0; i < this.layout.flyingObjects.length; i++) {
      let f = this.layout.flyingObjects[i];
      this.writeVec3(f.pos);
      this.writeVec3(f.scale);
      this.writeString(f.prefabName);
    }

    // Rocks
    this.writeInt32(this.layout.rocks.length);
    for (let i = 0; i < this.layout.rocks.length; i++) {
      let r = this.layout.rocks[i];
      this.writeVec3(r.pos);
      this.writeVec3(r.scale);
      this.writeString(r.prefabName);
      this.writeBool(r.flipped);
    }

    // Water blocks
    this.writeInt32(this.layout.waterBlocks.length);
    for (let i = 0; i < this.layout.waterBlocks.length; i++) {
      let w = this.layout.waterBlocks[i];
      this.writeVec3(w.pos);
      this.writeFloat(w.width);
      this.writeFloat(w.height);
      this.writeBool(w.lockPosition);
    }

    // Budget
    this.writeInt32(this.layout.budget.cash); // Cash
    this.writeInt32(this.layout.budget.road); // Road
    this.writeInt32(this.layout.budget.wood); // Wood
    this.writeInt32(this.layout.budget.steel); // Steel
    this.writeInt32(this.layout.budget.hydraulics); // Hydraulics
    this.writeInt32(this.layout.budget.rope); // Rope
    this.writeInt32(this.layout.budget.cable); // Cable
    this.writeInt32(this.layout.budget.spring); // Spring
    this.writeInt32(this.layout.budget.bungeeRope); // Bungee rope
    this.writeBool(this.layout.budget.allowWood); // Allow wood
    this.writeBool(this.layout.budget.allowSteel); // Allow steel
    this.writeBool(this.layout.budget.allowHydraulics); // Allow hydraulics
    this.writeBool(this.layout.budget.allowRope); // Allow rope
    this.writeBool(this.layout.budget.allowCable); // Allow cable
    this.writeBool(this.layout.budget.allowSpring); // Allow spring
    this.writeBool(this.layout.budget.allowReinforcedRoad); // Allow reinforced road

    // Settings
    this.writeBool(this.layout.settings.hydraulicsControllerEnabled); // Hydraulics controller enabled
    this.writeBool(this.layout.settings.unbreakable); // Unbreakable
    this.writeBool(this.layout.settings.noWater); // No water

    // Custom shapes
    this.writeInt32(this.layout.customShapes.length);
    for (let i = 0; i < this.layout.customShapes.length; i++) {
      let c = this.layout.customShapes[i];
      this.writeVec3(c.pos);
      this.writeQuaternion(c.rot);
      this.writeVec3(c.scale);
      this.writeBool(c.flipped);
      this.writeBool(c.dynamic);
      this.writeBool(c.collidesWithRoad);
      this.writeBool(c.collidesWithNodes);
      this.writeBool(c.collidesWithSplitNodes);
      this.writeFloat(c.rotationDegrees);
      this.writeColor(c.color);
      this.writeFloat(c.mass);
      this.writeFloat(c.bounciness);
      this.writeFloat(c.pinMotorStrength);
      this.writeFloat(c.pinTargetVelocity);

      this.writeInt32(c.pointsLocalSpace.length);  // Points
      for (let j = 0; j < c.pointsLocalSpace.length; j++) {
        this.writeVec2(c.pointsLocalSpace[j]);
      }

      this.writeInt32(c.staticPins.length); // Static pins
      for (let j = 0; j < c.staticPins.length; j++) {
        this.writeVec3(c.staticPins[j]);
      }

      this.writeInt32(c.dynamicAnchorGuids.length); // Dynamic anchors
      for (let j = 0; j < c.dynamicAnchorGuids.length; j++) {
        this.writeString(c.dynamicAnchorGuids[j]);
      }

    }

    // Workshop
    this.writeString(this.layout.workshop.id);
    this.writeString(this.layout.workshop.leaderboardId);
    this.writeString(this.layout.workshop.title);
    this.writeString(this.layout.workshop.description);
    this.writeBool(this.layout.workshop.autoplay);

    this.writeInt32(this.layout.workshop.tags.length);
    for (let i = 0; i < this.layout.workshop.tags.length; i++) {
      this.writeString(this.layout.workshop.tags[i]);
    }

    // Support pillars
    this.writeInt32(this.layout.supportPillars.length);
    for (let i = 0; i < this.layout.supportPillars.length; i++) {
      let p = this.layout.supportPillars[i];
      this.writeVec3(p.pos);
      this.writeVec3(p.scale);
      this.writeString(p.prefabName);
    }

    // Pillars
    this.writeInt32(this.layout.pillars.length);
    for (let i = 0; i < this.layout.pillars.length; i++) {
      let p = this.layout.pillars[i];
      this.writeVec3(p.pos);
      this.writeFloat(p.height);
      this.writeString(p.prefabName);
    }
  }
  // PTF support
  serializeModDataBinary() {
    // Mod metadata
    this.writeInt16(this.layout.modData.mods.length);
    for (let i = 0; i < this.layout.modData.mods.length; i++) {
      let m = this.layout.modData.mods[i];
      // Format as a string (PTF uses ByteSerializer.SerializeStrings)
      let str = `${m.name}\u058D${m.version}\u058D${m.settings.join("|")}`;
      this.writeString(str);
    }

    // Mod save data
    this.writeInt32(this.layout.modData.modSaveData.length);
    for (let i = 0; i < this.layout.modData.modSaveData.length; i++) {
      let m = this.layout.modData.modSaveData[i];
      this.writeString(`${m.name}\u058D${m.version}`);
      this.writeByteArray(
        // base64 decode
        atob(m.data).split("").map(c => c.charCodeAt(0))
      )
    }
  }

  serializeLayout() {
    let size = this.estimateSize();
    console.log("Allocating " + size + " bytes for serialized data.");

    this.buffer = new Uint8Array(size);
    this.serializePreBridgeBinary();
    this.serializeBridgeBinary(false);
    this.serializePostBridgeBinary();

    this.layout.modData.mods = [];
    this.layout.modData.modSaveData = [];

    if (this.layout.isModded) {
      this.serializeModDataBinary();
    }

    // Make sure to trim the buffer to the actual size
    this.buffer = this.buffer.slice(0, this.offset);
  }

  fromJSON(json) {
    let j = JSON.parse(json);
    return unCSharpifyKeys(j);
  }
}


class SlotDeserializer {
  constructor(buffer) {
    this.data = buffer;  // Is a Uint8Array for vanilla JS compatibility
    this.offset = 0;
    this.errors = [];
    this.slot = {
      version: MAX_SLOT_VERSION
    };
  }

  readByte() {
    let b = this.data[this.offset];
    this.offset++;
    return b;
  }
  readBytes(count) {
    const bytes = this.data.slice(this.offset, this.offset + count);
    this.offset += count;
    return bytes;
  }
  readBool() {
    return this.readByte() !== 0;
  }
  readInt32() {
    const value = this.readBytes(4);
    let buf = new ArrayBuffer(4);
    let view = new DataView(buf);

    for (let i = 0; i < 4; i++) {
      view.setUint8(i, value[3 - i]);
    }

    return view.getInt32(0)
  }
  readLong() {
    const value = this.readBytes(8);
    let buf = new ArrayBuffer(8);
    let view = new DataView(buf);

    for (let i = 0; i < 8; i++) {
      view.setUint8(i, value[7 - i]);  // Little endian
    }

    return view.getBigUint64(0)
  }
  readString() {
    // UTF-8 or UTF-16LE
    let num = this.readByte();
    if (num < 0) {
      return "";
    }
    if (num === 0x00) {  // utf8
      let num2 = this.readInt32();
      return new TextDecoder().decode(this.readBytes(num2));
    }
    if (num === 0x01) {  // utf16
      let num3 = this.readInt32();
      let num4 = num3 * 2;
      return new TextDecoder('utf-16').decode(this.readBytes(num4));
    }
  }
  assert(condition, message) {
    if (!condition) {
      this.errors.push(message);
    }
  }

  readTypeEntry() {
    let num = this.readByte();
    if (num < 0) {
      return {
        'typeName': null,
        'assemblyName': null
      };
    }
    if (num === 0x2F) {
      // Type name
      let key = this.readInt32();
      let typeAndAssembly = this.readString().split(", ");
      let typeName = typeAndAssembly[0];
      let assemblyName = typeAndAssembly[1];

      return {
        'typeName': typeName,
        'assemblyName': assemblyName
      }
    } else if (num === 0x30) {
      // Type ID
      // Assume the deserializer has an override and continue
    } else {
      this.errors.push("Unknown type entry: " + num);
      return {
        'typeName': null,
        'assemblyName': null
      }
    }
  }

  deserializeSlot() {
    // A bit on how this works:
    //   Save slots are serialized using Odin Serializer. Unfortunately, this is JavaScript, so we can't use the
    //   serializer directly. Instead, we have to use a very static implementation that only reads and writes the
    //   exact bytes we know should be read and written.

    this.assert(this.readByte() === 0x02, "Expected unnamed start of reference node");
    let typeEntry = this.readTypeEntry();
    this.assert(typeEntry.typeName === "BridgeSaveSlotData", "Expected typename to be BridgeSaveSlotData");
    this.assert(typeEntry.assemblyName === "Assembly-CSharp", "Expected assembly to be Assembly-CSharp");
    this.assert(this.readInt32() === 0, "Expected node ID to be 0");

    // Version
    let type = this.readByte();
    this.assert(type === 0x17, "Expected type to be NamedInt");
    let name = this.readString();
    this.assert(name === "m_Version", "Expected name to be m_Version");
    this.slot.version = this.readInt32();
    if (this.slot.version > MAX_SLOT_VERSION) {
      this.errors.push("Warning: Slot version is higher than supported version");
    }

    // Physics version
    type = this.readByte();
    this.assert(type === 0x17, "Expected type to be NamedInt");
    name = this.readString();
    this.assert(name === "m_PhysicsVersion", "Expected name to be m_PhysicsVersion");
    this.slot.physicsVersion = this.readInt32();
    if (this.slot.physicsVersion > MAX_PHYSICS_VERSION) {
      this.errors.push("Warning: Physics version is higher than supported version");
    }

    // Slot ID
    type = this.readByte();
    this.assert(type === 0x17, "Expected type to be NamedInt");
    name = this.readString();
    this.assert(name === "m_SlotID", "Expected name to be m_SlotID");
    this.slot.slotID = this.readInt32();

    // Slot display name
    type = this.readByte();
    this.assert(type === 0x27, "Expected type to be NamedString");
    name = this.readString();
    this.assert(name === "m_DisplayName", "Expected name to be m_DisplayName");
    this.slot.displayName = this.readString();

    // Slot filename
    type = this.readByte();
    this.assert(type === 0x27, "Expected type to be NamedString");
    name = this.readString();
    this.assert(name === "m_SlotFilename", "Expected name to be m_SlotFilename");
    this.slot.slotFilename = this.readString();

    // Budget
    type = this.readByte();
    this.assert(type === 0x17, "Expected type to be NamedInt");
    name = this.readString();
    this.assert(name === "m_Budget", "Expected name to be m_Budget");
    this.slot.budget = this.readInt32();

    // Last write time in C# ticks
    type = this.readByte();
    this.assert(type === 0x1B, "Expected type to be NamedLong");
    name = this.readString();
    this.assert(name === "m_LastWriteTimeTicks", "Expected name to be m_LastWriteTimeTicks");
    this.slot.lastWriteTimeTicks = this.readLong();

    // Bridge
    type = this.readByte();
    this.assert(type === 0x01, "Expected named start of reference node");
    name = this.readString();
    this.assert(name === "m_Bridge", "Expected name to be m_Bridge");
    let te = this.readTypeEntry();
    this.assert(te.typeName === "System.Byte[]", "Expected type to be System.Byte[]");
    this.assert(te.assemblyName === "mscorlib", "Expected assembly to be mscorlib");
    this.assert(this.readInt32() === 1, "Expected node ID to be 1");

    this.assert(this.readByte() === 0x08, "Expected primitive array entry");
    let num = this.readInt32();
    let num2 = this.readInt32();
    let num3 = num * num2;
    let bridgeData = this.readBytes(num3);

    this.assert(this.readByte() === 0x05, "Expected end of reference node");

    // Thumbnail
    type = this.readByte();
    if (type === 0x2D) {
      // Named null, no thumbnail
      this.assert(this.readString() === "m_Thumb", "Expected name to be m_Thumb");
      this.slot.thumbnail = null;
    } else if (type === 0x01) {
      name = this.readString();
      this.assert(name === "m_Thumb", "Expected name to be m_Thumb");
      this.readByte();  // Type ID entry
      this.readInt32();  // Type ID
      this.readInt32();  // Node ID, we don't care about this since it's with a type ID

      this.assert(this.readByte() === 0x08, "Expected primitive array entry");
      num = this.readInt32();
      num2 = this.readInt32();
      num3 = num * num2;
      this.slot.thumbnail = this.readBytes(num3);

      this.assert(this.readByte() === 0x05, "Expected end of reference node");
    }

    // If the layout uses unlimited materials
    type = this.readByte();
    this.assert(type === 0x2B, "Expected type to be NamedBoolean");
    name = this.readString();
    this.assert(name === "m_UsingUnlimitedMaterials", "Expected name to be m_UsingUnlimitedMaterials");
    this.slot.usingUnlimitedMaterials = this.readBool();

    // If the layout uses unlimited budget
    type = this.readByte();
    this.assert(type === 0x2B, "Expected type to be NamedBoolean");
    name = this.readString();
    this.assert(name === "m_UsingUnlimitedBudget", "Expected name to be m_UsingUnlimitedBudget");
    this.slot.usingUnlimitedBudget = this.readBool();

    // End of node
    this.assert(this.readByte() === 0x05, "Expected end of node");

    // Now, let's parse the bridge data
    // We can use the same code as the layout parser, but just call the deserializeBridge() method
    let d = new Deserializer(bridgeData);
    d.deserializeBridge();
    this.slot.bridge = d.layout.bridge;
  }

  base64EncodeThumb() {
    function uint8ToString(u8a){
      const CHUNK_SZ = 0x8000;
      let c = [];
      for (let i = 0; i < u8a.length; i += CHUNK_SZ) {
        c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
      }
      return c.join("");
    }

    return btoa(uint8ToString(this.slot.thumbnail));
  }

  dumpJSON() {
    let copySlot = JSON.parse(JSON.stringify(this.slot, (_, v) => typeof v === 'bigint' ? Number(v) : v));
    // base64 encode the thumbnail
    if (this.slot.thumbnail) {
      copySlot.thumbnail = this.base64EncodeThumb();
    } else {
      copySlot.thumbnail = null;
    }

    copySlot = cSharpifyKeys(copySlot);
    return JSON.stringify(copySlot, (_, v) => typeof v === 'bigint' ? Number(v) : v, 2);
  }
}


class SlotSerializer {
  constructor(slot) {
    if (typeof slot === 'object') {
      this.slot = slot;
    } else if (typeof slot === 'string') {
      this.slot = this.fromJSON(slot);
    }

    let size = this.estimateSize();
    console.log("Allocating " + size + " bytes");
    this.buffer = Uint8Array.from({ length: size });
    this.offset = 0;
  }

  estimateSize() {
    let size = 0;
    size += 4;  // Version
    size += 4;  // Physics version
    size += 4;  // Slot ID
    size += this.slot.displayName.length + 4;  // Slot display name
    size += this.slot.slotFilename.length + 4;  // Slot filename
    size += 4;  // Budget
    size += 8;  // Last write time in C# ticks
    size += this.slot.thumbnail ? this.slot.thumbnail.length + 4 : 4;  // Thumbnail
    size += 1;  // Using unlimited materials
    size += 1;  // Using unlimited budget

    // Bridge
    size += 4;  // Bridge version
    size += this.slot.bridge.anchors.length * 128;  // Anchors
    size += this.slot.bridge.joints.length * 128;  // Joints
    size += this.slot.bridge.edges.length * 128;  // Edges
    size += this.slot.bridge.pistons.length * 128;  // Pistons
    size += this.slot.bridge.springs.length * 128;  // Springs
    // Phases
    size += this.slot.bridge.phases.length * 128;
    for (let i = 0; i < this.slot.bridge.phases.length; i++) {
      let phase = this.slot.bridge.phases[i];
      size += phase.pistonGuids.length * 128;
      size += phase.splitJoints.length * 128;
    }

    // We'll add a kB for entries, names, etc
    size += 1024;

    return size;
  }

  writeByte(value) {
    this.buffer[this.offset++] = value;
  }
  writeBytes(value, count) {
    for (let i = 0; i < count; i++) {
      this.writeByte(value[i]);
    }
  }
  writeBool(value) {
    this.writeByte(value ? 1 : 0);
  }
  writeInt32(value) {
    let bytes = new Uint8Array(4);
    bytes[0] = value & 0xFF;
    bytes[1] = (value >> 8) & 0xFF;
    bytes[2] = (value >> 16) & 0xFF;
    bytes[3] = (value >> 24) & 0xFF;
    this.writeBytes(bytes, 4);
  }
  writeString(value) {
    this.writeByte(0x00);
    this.writeInt32(value.length);
    this.writeBytes(new Uint8Array(new TextEncoder().encode(value)), value.length);
  }
  writeLong(value) {
    let bytes = new Uint8Array(8);
    bytes[0] = value & 0xFF;
    bytes[1] = (value >> 8) & 0xFF;
    bytes[2] = (value >> 16) & 0xFF;
    bytes[3] = (value >> 24) & 0xFF;
    this.writeBytes(bytes, 8);
  }

  serializeSlot() {
    this.writeByte(0x02);  // Start of node
    this.writeByte(0x2F);  // Type name
    this.writeInt32(0);    // Node ID
    this.writeString("BridgeSaveSlotData, Assembly-CSharp");  // Type name and assembly name
    this.writeInt32(0);    // Idk

    // Version
    this.writeByte(0x17);  // Named int
    this.writeString("m_Version");
    this.writeInt32(MAX_SLOT_VERSION);

    // Physics version
    this.writeByte(0x17);  // Named int
    this.writeString("m_PhysicsVersion");
    this.writeInt32(MAX_PHYSICS_VERSION);

    // Slot ID
    this.writeByte(0x17);  // Named int
    this.writeString("m_SlotID");
    this.writeInt32(this.slot.slotID);

    // Display name
    this.writeByte(0x27);  // Named string
    this.writeString("m_DisplayName");
    this.writeString(this.slot.displayName);

    // Slot filename
    this.writeByte(0x27);  // Named string
    this.writeString("m_SlotFilename");
    this.writeString(this.slot.slotFilename);

    // Budget
    this.writeByte(0x17);  // Named int
    this.writeString("m_Budget");
    this.writeInt32(this.slot.budget);

    // Last write time
    this.writeByte(0x1B);  // Named long
    this.writeString("m_LastWriteTimeTicks");
    this.writeLong(this.slot.lastWriteTimeTicks);

    // Bridge
    this.writeByte(0x01);  // Named start of reference node
    this.writeString("m_Bridge");
    this.writeByte(0x2F);  // Type name
    this.writeInt32(1);    // Node ID
    this.writeString("System.Byte[], mscorlib");  // Type name and assembly name
    this.writeInt32(1);    // Also node ID
    this.writeByte(0x08);  // Primitive array
    // Let's prepare the bridge binary
    let layout = {'bridge': this.slot.bridge}
    // these things don't matter
    layout.anchors = [];
    layout.phases = [];
    layout.zedAxisVehicles = [];
    layout.vehicles = [];
    layout.vehicleStopTriggers = [];
    layout.eventTimelines = [];
    layout.checkpoints = [];
    layout.terrainStretches = [];
    layout.platforms = [];
    layout.ramps = [];
    layout.vehicleRestartPhases = [];
    layout.flyingObjects = [];
    layout.rocks = [];
    layout.waterBlocks = [];
    layout.customShapes = [];
    layout.supportPillars = [];
    layout.pillars = [];
    layout.workshop = {
      id: "", title: "", description: "", leaderboardId: "", tags: []
    }
    let d = new Serializer(layout);
    d.serializeBridgeBinary(true);
    this.writeInt32(d.buffer.length);  // Array length
    this.writeInt32(1);          // Array height
    this.writeBytes(d.buffer, d.buffer.length);  // Array data

    this.writeByte(0x05);  // End of node

    // Thumbnail
    if (this.slot.thumbnail === null) {
      this.writeByte(0x2D);  // Named null
      this.writeString("m_Thumb");  // Name
    } else {
      this.writeByte(0x01);  // Named start of reference node
      this.writeString("m_Thumb");  // Name
      this.writeByte(0x30);  // Type ID entry
      this.writeInt32(1);  // Type ID
      this.writeInt32(2);  // Node ID

      this.writeByte(0x08);  // Primitive array
      this.writeInt32(1);  // Array height
      this.writeInt32(this.slot.thumbnail.length);  // Array length
      this.writeBytes(this.slot.thumbnail, this.slot.thumbnail.length);

      this.writeByte(0x05);  // End of node
    }

    // Using unlimited materials
    this.writeByte(0x2B);  // Named boolean
    this.writeString("m_UsingUnlimitedMaterials");  // Name
    this.writeBool(this.slot.usingUnlimitedMaterials);

    // Using unlimited budget
    this.writeByte(0x2B);  // Named boolean
    this.writeString("m_UsingUnlimitedBudget");  // Name
    this.writeBool(this.slot.usingUnlimitedBudget);

    // End of node
    this.writeByte(0x05);


    // Make sure to resize the buffer to the correct size
    this.buffer = this.buffer.slice(0, this.offset);
  }

  fromJSON(json) {
    let j = JSON.parse(json);
    j = unCSharpifyKeys(j);

    j.lastWriteTimeTicks = Number(j.lastWriteTimeTicks);

    if (j.thumbnail) {
      // Base64 decode the thumbnail into a Uint8Array
      j.thumbnail = Uint8Array.from(atob(j.thumbnail.toString()).split("").map(function(c) {
        return c.charCodeAt(0);
      }));
    }
    return j;
  }
}

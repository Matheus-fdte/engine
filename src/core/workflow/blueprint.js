const lodash = require("lodash");
const assert = require("assert");
const nodes = require("./nodes");
const bpu = require("../utils/blueprint");
const obju = require("../utils/object");
const { Lane } = require("./lanes");
const { abstractFactory } = require("../utils/factory");
const { Validator } = require("../validators");
const node_factory = require("../utils/node_factory");

class Blueprint {
  static get rules() {
    return {
      "has_spec": [obju.isNotNull],
      "has_nodes": [obju.hasField, "nodes"],
      "has_lanes": [obju.hasField, "lanes"],
      "has_requirements": [obju.hasField, "requirements"],
      "has_prepare": [obju.hasField, "prepare"],
      "has_environment": [obju.hasField, "environment"],
      "environment_has_valid_type": [obju.isFieldOfType, "environment", "object"],
      "nodes_has_valid_type": [obju.isFieldOfType, "nodes", "object"],
      "lanes_has_valid_type": [obju.isFieldOfType, "lanes", "object"],
      "requirements_has_valid_type": [obju.isFieldOfType, "requirements", "object"],
      "prepare_has_valid_type": [obju.isFieldOfType, "prepare", "object"],
      "has_valid_start_nodes": [bpu.hasValidStartNodes],
      "has_at_least_one_finish_node": [bpu.hasAtLeastOneFinishNode],
      "are_all_nodes_present": [bpu.areAllNodesPresent],
      "are_all_lanes_present": [bpu.areAllLanesPresent]
    };
  }

  static validate_nodes(spec) {
    for (const node_spec of spec.nodes) {
      const [is_valid, error] = Blueprint._parseNode(node_spec).validate();
      if (!is_valid) {
        const node_id = node_spec.id;
        const error_message = `node ${node_id}: ${error}`;
        return [false, error_message];
      }
    }
    return [true, null];
  }

  static validate_lanes(spec) {
    for (const lane_spec of spec.lanes) {
      const [is_valid, error] = Blueprint._parseLane(lane_spec).validate();
      if (!is_valid) {
        const lane_id = lane_spec.id;
        const error_message = `lane ${lane_id}: ${error}`;
        return [false, error_message];
      }
    }
    return [true, null];
  }

  static validate(spec) {
    const [is_valid, error] = new Validator(this.rules).validate(spec);
    if (!is_valid) {
      return [false, error];
    }
    const [is_nodes_valid, nodes_error] = Blueprint.validate_nodes(spec);
    if (!is_nodes_valid) {
      return [false, nodes_error];
    }
    return Blueprint.validate_lanes(spec);
  };

  static assert_is_valid(spec) {
    const [is_valid, error] = Blueprint.validate(spec);
    assert(is_valid, error);
  }

  static parseSpec(blueprint_spec) {
    const result_spec = lodash.cloneDeep(blueprint_spec);
    for(const [key, value] of Object.entries(result_spec.environment)) {
      result_spec.environment[key] = process.env[value];
    }
    return result_spec;
  }

  static _parseNode(node_spec) {
    return node_factory.getNode(node_spec);
  }

  static _parseLane(lane_spec) {
    return new Lane(lane_spec);
  }

  constructor(spec) {
    Blueprint.assert_is_valid(spec);
    this._spec = spec;
  }

  fetchNode(node_id) {
    const node = this._spec.nodes.filter(
      node_spec => node_spec["id"] == node_id
    )[0];
    return node ? Blueprint._parseNode(node) : null;
  }

  fetchNodeLane(node_id) {
    const node = this._spec.nodes.filter(
      node_spec => node_spec.id == node_id
    )[0];
    if (node) {
      const lane_id = node.lane_id;
      const lane = this._spec.lanes.filter(
        lane_spec => lane_spec.id == lane_id
      )[0];
      return lane ? Blueprint._parseLane(lane) : null;
    }
    return null;
  }
}

module.exports = {
  Blueprint: Blueprint
};

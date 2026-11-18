// World units are meters. +z points forward along the track, +x to the right, +y up.
export const LANE_W = 2.3;
export const LANE_X = [-LANE_W, 0, LANE_W] as const;
export const ROAD_HALF = LANE_W * 1.5 + 0.35;

export const PLAYER_HALF_W = 0.36;
export const PLAYER_HALF_D = 0.35;
export const PLAYER_H = 1.85;
export const PLAYER_SLIDE_H = 0.8;

export const JUMP_TIME = 0.64;
export const JUMP_HEIGHT = 1.7;
export const SUPER_JUMP_TIME = 0.95;
export const SUPER_JUMP_HEIGHT = 3.7;
export const SLIDE_TIME = 0.72;
export const LANE_CHANGE_TIME = 0.15;

export const CAM_HEIGHT = 5.4;
export const CAM_BACK = 6.2; // camera distance behind the player
export const DRAW_DIST = 175;
export const GEN_LOOKAHEAD = 230; // track is generated this far ahead of the player
export const MOVING_TRIGGER = 150; // oncoming vehicles start driving when this far away

export const PX_PER_M = 80; // texture resolution for world sprites

export function laneX(lane: number) {
  return LANE_X[lane];
}

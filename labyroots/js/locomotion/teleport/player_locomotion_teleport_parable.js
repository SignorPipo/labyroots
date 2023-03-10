PlayerLocomotionTeleportParable = class PlayerLocomotionTeleportParable {
    constructor() {
        this._myStartPosition = PP.vec3_create();

        this._myForward = PP.vec3_create();
        this._myUp = PP.vec3_create();

        this._mySpeed = 0;
        this._myGravity = 0;
        this._myStepLength = 0;
    }

    setStartPosition(startPosition) {
        this._myStartPosition.vec3_copy(startPosition);
    }

    setForward(forward) {
        this._myForward.vec3_copy(forward);
    }

    setUp(up) {
        this._myUp.vec3_copy(up);
    }

    setSpeed(speed) {
        this._mySpeed = speed;
    }

    setGravity(gravity) {
        this._myGravity = gravity;
    }

    setStepLength(stepLength) {
        this._myStepLength = stepLength;
    }

    getPosition(positionIndex, outPosition = PP.vec3_create()) {
        // implemented outside class definition
    }

    getDistance(positionIndex) {
        // implemented outside class definition
    }

    getPositionIndexByDistance(distance) {
        // implemented outside class definition
    }

    getPositionByDistance(distance, outPosition = PP.vec3_create()) {
        // implemented outside class definition
    }

    getDistanceOverFlatDistance(flatDistance, maxParableDistance) {
        // implemented outside class definition
    }

    getFlatDistanceOverDistance(distance) {
        // implemented outside class definition
    }
};

PlayerLocomotionTeleportParable.prototype.getPosition = function () {
    let forwardPosition = PP.vec3_create();
    let upPosition = PP.vec3_create();
    return function getPosition(positionIndex, outPosition = PP.vec3_create()) {
        let deltaTimePerStep = this._myStepLength / this._mySpeed;

        let elapsedTime = deltaTimePerStep * positionIndex;

        forwardPosition = this._myForward.vec3_scale(this._mySpeed * elapsedTime, forwardPosition);
        forwardPosition = forwardPosition.vec3_add(this._myStartPosition, forwardPosition);

        upPosition = this._myUp.vec3_scale(this._myGravity * elapsedTime * elapsedTime / 2, upPosition);

        outPosition = forwardPosition.vec3_add(upPosition, outPosition);

        return outPosition;
    };
}();

PlayerLocomotionTeleportParable.prototype.getDistance = function () {
    let currentPosition = PP.vec3_create();
    let prevPosition = PP.vec3_create();
    return function getDistance(positionIndex) {
        let distance = 0;
        prevPosition.vec3_copy(this._myStartPosition);

        for (let i = 1; i <= positionIndex; i++) {
            currentPosition = this.getPosition(i, currentPosition);
            distance += currentPosition.vec3_distance(prevPosition);

            prevPosition.vec3_copy(currentPosition);
        }

        return distance;
    };
}();

PlayerLocomotionTeleportParable.prototype.getPositionIndexByDistance = function () {
    let currentPosition = PP.vec3_create();
    let prevPosition = PP.vec3_create();
    return function getPositionIndexByDistance(distance) {
        let currentDistance = 0;
        let currentIndex = 0;
        prevPosition = this.getPosition(currentIndex, prevPosition);

        while (currentDistance < distance) {
            currentPosition = this.getPosition(currentIndex + 1, currentPosition);
            currentDistance += currentPosition.vec3_distance(prevPosition);
            currentIndex++;

            prevPosition.vec3_copy(currentPosition);
        }

        return Math.max(0, currentIndex - 1);
    };
}();

PlayerLocomotionTeleportParable.prototype.getPositionByDistance = function () {
    let currentPosition = PP.vec3_create();
    let prevPosition = PP.vec3_create();
    let prevToCurrent = PP.vec3_create();
    return function getPositionIndexByDistance(distance, outPosition = PP.vec3_create()) {
        let currentDistance = 0;
        let currentIndex = 0;
        let found = false;

        prevPosition = this.getPosition(currentIndex, prevPosition);
        while (!found) {
            currentPosition = this.getPosition(currentIndex + 1, currentPosition);
            currentDistance += currentPosition.vec3_distance(prevPosition);
            currentIndex++;

            if (currentDistance > distance) {
                let lengthToRemove = currentDistance - distance;
                prevToCurrent = currentPosition.vec3_sub(prevPosition, prevToCurrent);
                let lengthToAdd = prevToCurrent.vec3_length() - lengthToRemove;
                prevToCurrent.vec3_normalize(prevToCurrent);

                outPosition = prevPosition.vec3_add(prevToCurrent.vec3_scale(lengthToAdd, outPosition), outPosition);
                found = true;
            }
            prevPosition.vec3_copy(currentPosition);
        }

        return outPosition;
    };
}();

PlayerLocomotionTeleportParable.prototype.getDistanceOverFlatDistance = function () {
    let currentPosition = PP.vec3_create();
    let flatCurrentPosition = PP.vec3_create();
    let flatStartPosition = PP.vec3_create();
    let prevPosition = PP.vec3_create();
    let prevToCurrent = PP.vec3_create();
    let startToCurrentFlat = PP.vec3_create();
    return function getDistanceOverFlatDistance(flatDistance, maxParableDistance) {
        if (flatDistance < 0.00001) {
            return 0;
        }

        let currentDistance = 0;
        let currentIndex = 0;
        flatStartPosition = this._myStartPosition.vec3_removeComponentAlongAxis(this._myUp, flatStartPosition);
        prevPosition = this.getPosition(currentIndex, prevPosition);

        let distanceOverFlatDistance = 0;

        while (currentDistance <= maxParableDistance) {
            currentPosition = this.getPosition(currentIndex + 1, currentPosition);
            currentDistance += currentPosition.vec3_distance(prevPosition);
            currentIndex++;

            flatCurrentPosition = currentPosition.vec3_removeComponentAlongAxis(this._myUp, flatCurrentPosition);
            startToCurrentFlat = flatCurrentPosition.vec3_sub(flatStartPosition, startToCurrentFlat);
            let currentFlatDistance = startToCurrentFlat.vec3_length();
            if (currentFlatDistance >= flatDistance) {
                let flatDifference = currentFlatDistance - flatDistance;
                prevToCurrent = currentPosition.vec3_sub(prevPosition, prevToCurrent);
                let angleWithFlat = prevToCurrent.vec3_angleRadians(startToCurrentFlat);
                let cos = Math.cos(angleWithFlat);
                let lengthToRemove = prevToCurrent.vec3_length();
                if (cos != 0) {
                    lengthToRemove = flatDifference / Math.cos(angleWithFlat);
                }

                distanceOverFlatDistance = currentDistance - lengthToRemove;
                break;

            } else {
                distanceOverFlatDistance = currentDistance;
            }

            prevPosition.vec3_copy(currentPosition);
        }

        return Math.min(maxParableDistance, distanceOverFlatDistance);
    };
}();

PlayerLocomotionTeleportParable.prototype.getFlatDistanceOverDistance = function () {
    let positionByDistance = PP.vec3_create();
    let flatPositionByDistance = PP.vec3_create();
    let flatStartPosition = PP.vec3_create();
    return function getFlatDistanceOverDistance(distance) {
        positionByDistance = this.getPositionByDistance(distance, positionByDistance);

        flatPositionByDistance = positionByDistance.vec3_removeComponentAlongAxis(this._myUp, flatPositionByDistance);
        flatStartPosition = this._myStartPosition.vec3_removeComponentAlongAxis(this._myUp, flatStartPosition);

        return flatStartPosition.vec3_distance(flatPositionByDistance);
    };
}();
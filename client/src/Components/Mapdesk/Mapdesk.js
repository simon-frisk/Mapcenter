import React, { createRef, useState, useEffect } from 'react'
import { genColor, cosineRule, Desk, DeskButtons, Canvas } from './Util'
import { 
    useViewportSizeAndPreventCanvasScrolling,
    getUserinputPosition, 
    moveMap, 
    zoomInHandler, 
    zoomOutHandler 
} from './Map'
import {
    calculateGpsMapCoords, 
    calculatePointsTriangleSides, 
    closestGpsPoint, 
    getMoveGpsRelevantPoints, 
    getRotationDirection, 
    manipulatePoint,
    drawGpsGroup
} from './Gps'
import IconButton from '@material-ui/core/IconButton'
import ZoomIn from '@material-ui/icons/ZoomIn'
import ZoomOut from '@material-ui/icons/ZoomOut'
import Loading from '../Presentation/Loading'

export default props => {
    const canvasRef = createRef()
    const windowSize = useViewportSizeAndPreventCanvasScrolling(canvasRef)
    const [ mapGeometry, setMapGeometry ] = useState()
    const [ map, setMap ] = useState()
    const [ gpsDrawData, setGpsDrawData ] = useState()
    const [ userInput, setUserInput ] = useState({
        x: null,
        y: null,
        down: false,
        target: null
    })

    const [fixPoints, setFixPoints] = useState([])
    const [editingFixPoint, setEditingFixPoint] = useState()

    useEffect(() => {
        const img = new Image()
        img.src = process.env.REACT_APP_API_URL + props.mapFile
        img.onload = () => {
            setMapGeometry({x: 0, y: 0, w: img.width, h: img.height})
            setMap(img)
        }
    }, [])

    useEffect(() => {
        if(map) {
            const scale = map.width / mapGeometry.w
            const gpsDrawData = props.gpsGroup.map(gps => {
                return gps.map(point => ({
                    ...point,
                    x: (point.x + mapGeometry.x) * scale,
                    y: (point.y + mapGeometry.y) * scale
                }))
            })
            setGpsDrawData(gpsDrawData)
        }
    }, [props.gpsGroup, map])

    useEffect(() => {
        if(map && canvasRef.current) render()
    })

    function render() {
        const colorGenerator = genColor()
        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        const { x, y, w, h } = mapGeometry
        ctx.drawImage(map, x, y, w, h)
        drawGpsGroup(gpsDrawData, ctx, userInput, colorGenerator, w)
    }

    function onDown(e) {
        const userCoord = getUserinputPosition(canvasRef.current, e)
        const target = closestGpsPoint(gpsDrawData, userCoord)
        if(target)
            setEditingFixPoint({ gpsIndex: target.gpsIndex, index: target.index })
        setUserInput({
            ...userInput,
            ...userCoord,
            down: true,
            target
        })
    }

    function onUp() {
        if(editingFixPoint) {
            setFixPoints([...fixPoints, editingFixPoint])
            setEditingFixPoint(null)
        }
        setUserInput({
            ...userInput,
            down: false,
            target: null
        })
    }
    
    function onMove(event) {
        if(event.nativeEvent.type === 'touchmove' && event.touches.length === 0) return

        const userCoord = getUserinputPosition(canvasRef.current, event)
        const move = {
            x: userCoord.x - userInput.x,
            y: userCoord.y - userInput.y
        }
        setUserInput({
            ...userInput,
            ...userCoord,
            target: userInput.down ? userInput.target : closestGpsPoint(gpsDrawData, userCoord)
        })
        if(!editingFixPoint && userInput.down) {
            moveMap(mapGeometry, move, gpsDrawData, canvasRef)
        }
        else if(props.setGpsGroup && editingFixPoint) {
            let newGpsData = gpsDrawData
            if(fixPoints.length > 1)
                fixPoints.length = 0
            if(fixPoints.length === 0) {
                newGpsData = gpsDrawData.map(gps => {
                    return gps.map(point => ({
                        ...point,
                        x: point.x + move.x,
                        y: point.y + move.y
                    }))
                })
            }
            else if(fixPoints.length === 1) {
                const { fixPoint, oldDragPoint, newDragPoint } = getMoveGpsRelevantPoints({
                    gps: gpsDrawData[userInput.target.gpsIndex],
                    target: editingFixPoint,
                    fixPoint: fixPoints[0],
                    move
                }) //bug here?
                const { fixToOldDistance, fixToNewDistance, oldToNewDistance } = calculatePointsTriangleSides(fixPoint, oldDragPoint, newDragPoint)
                const scale = fixToNewDistance / fixToOldDistance
                const angleOldToNew = cosineRule(fixToOldDistance, fixToNewDistance, oldToNewDistance)
                const rotationAngle = angleOldToNew * getRotationDirection(fixPoint, oldDragPoint, newDragPoint)
                newGpsData = gpsDrawData.map(gps => {
                    return gps.map(point => manipulatePoint(point, fixPoint, scale, rotationAngle))
                })
            }
            props.setGpsGroup(calculateGpsMapCoords(newGpsData, mapGeometry, map))
        }
    }

    function zoomIn() {
        zoomInHandler(mapGeometry, canvasRef, gpsDrawData, setGpsDrawData)
    }

    function zoomOut() {
        zoomOutHandler(mapGeometry, canvasRef, gpsDrawData, setGpsDrawData)
    }

    if(!map || !gpsDrawData)
        return <Loading />

    return (
        <Desk>
            <DeskButtons>
                <div style={{display: 'flex', alignContent: 'center'}}>
                    {props.children}
                </div>
                <div>
                    <IconButton color='secondary' onClick={zoomIn}><ZoomIn /></IconButton>
                    <IconButton color='secondary' onClick={zoomOut}><ZoomOut /></IconButton>
                </div>
            </DeskButtons>
            <Canvas
                style={{width: '100%', height: '100vh'}}
                width={windowSize.w}
                height={windowSize.h}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseLeave={onUp}
                onMouseUp={onUp}
                onTouchStart={onDown}
                onTouchMove={onMove}
                onTouchEnd={onUp}
                ref={canvasRef}
            />
        </Desk>
    )
}
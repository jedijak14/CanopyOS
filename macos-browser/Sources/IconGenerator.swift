import Cocoa
import Foundation

let directory = CommandLine.arguments[1]
let variants: [(String, Int)] = [("icon_16x16.png",16),("icon_16x16@2x.png",32),("icon_32x32.png",32),("icon_32x32@2x.png",64),("icon_128x128.png",128),("icon_128x128@2x.png",256),("icon_256x256.png",256),("icon_256x256@2x.png",512),("icon_512x512.png",512),("icon_512x512@2x.png",1024)]
for (name, pixels) in variants {
    let image = NSImage(size: NSSize(width: pixels, height: pixels))
    image.lockFocus()
    let scale = CGFloat(pixels) / 1024
    let transform = NSAffineTransform(); transform.scale(by: scale); transform.concat()
    let shape = NSBezierPath(roundedRect: NSRect(x: 32, y: 32, width: 960, height: 960), xRadius: 220, yRadius: 220)
    let gradient = NSGradient(starting: NSColor(calibratedRed: 0.09, green: 0.24, blue: 0.28, alpha: 1), ending: NSColor(calibratedRed: 0.11, green: 0.60, blue: 0.50, alpha: 1))!
    gradient.draw(in: shape, angle: 45)
    NSColor.white.withAlphaComponent(0.95).setStroke()
    let circle = NSBezierPath(ovalIn: NSRect(x: 212, y: 212, width: 600, height: 600)); circle.lineWidth = 40; circle.stroke()
    let needle = NSBezierPath(); needle.move(to: NSPoint(x: 635, y: 700)); needle.line(to: NSPoint(x: 551, y: 442)); needle.line(to: NSPoint(x: 389, y: 324)); needle.line(to: NSPoint(x: 476, y: 578)); needle.close()
    NSColor.white.setFill(); needle.fill()
    let dot = NSBezierPath(ovalIn: NSRect(x: 480, y: 480, width: 64, height: 64)); NSColor(calibratedRed: 0.08, green: 0.34, blue: 0.31, alpha: 1).setFill(); dot.fill()
    image.unlockFocus()
    guard let data = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Could not generate icon") }
    try png.write(to: URL(fileURLWithPath: directory).appendingPathComponent(name))
}

interface Notifier {
    getSupportedMethods: () => string[]
    notify: (destination: string, message: string) => boolean
}

export default Notifier;
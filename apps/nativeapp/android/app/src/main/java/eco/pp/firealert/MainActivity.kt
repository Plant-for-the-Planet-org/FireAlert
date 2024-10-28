package eco.pp.firealert

import android.os.Bundle
import org.devio.rn.splashscreen.SplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    /**
     * rendering of the Splash Screen.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        SplashScreen.show(this)
        super.onCreate(savedInstanceState)
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "FireAlert"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}